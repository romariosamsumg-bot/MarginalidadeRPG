/**
 * Motor narrativo: avaliador de condições + executor de efeitos (lista fechada) +
 * runtime de diálogo persistente. Opera sobre um RASCUNHO de GameState dentro do store.
 *
 * Garantias:
 *  - Conteúdo não executa código; somente tipos de efeito em EFFECT_TYPES.
 *  - Em cenas `once`, cada efeito recebe um ID estável e nunca é aplicado duas vezes,
 *    mesmo após recarregar a página ou importar o save.
 *  - Recompensas (respeito) passam pelo mecanismo oficial do núcleo (grantRespect).
 */
import type { GameState } from '../core/state';
import { grantRespect, log } from '../core/legacy/actions';
import { clamp, cryptoRng, type Rng } from '../core/legacy/util';
import type { Choice, Condition, DialogueNode, Effect, PanelId, Scene } from './types';
import { SCENES } from './content';

export const sceneById = new Map<string, Scene>(SCENES.map(s => [s.id, s]));

export function getScene(id: string): Scene | undefined { return sceneById.get(id); }
export function getNode(sceneId: string, nodeId: string): DialogueNode | undefined {
  return sceneById.get(sceneId)?.nodes.find(n => n.id === nodeId);
}

export function evalCond(s: GameState, c: Condition | undefined): boolean {
  if (!c) return true;
  if ('all' in c) return c.all.every(x => evalCond(s, x));
  if ('any' in c) return c.any.some(x => evalCond(s, x));
  if ('not' in c) return !evalCond(s, c.not);
  if ('notFlag' in c) { const v = s.story.flags[c.notFlag]; return v === undefined || v === false; }
  if ('flag' in c) {
    const v = s.story.flags[c.flag];
    return c.eq === undefined ? (v !== undefined && v !== false) : v === c.eq;
  }
  if ('stat' in c) return s.rpg.stats[c.stat] >= c.gte;
  if ('respect' in c) return s.rpg.respect >= c.respect;
  if ('stage' in c) return s.story.missions[c.mission]?.stage === c.stage && s.story.missions[c.mission]?.status === 'active';
  if ('mission' in c) return (s.story.missions[c.mission]?.status ?? 'locked') === c.status;
  if ('relation' in c) {
    const t = s.story.relationships[c.relation].trust;
    return (c.gte === undefined || t >= c.gte) && (c.lte === undefined || t <= c.lte);
  }
  if ('item' in c) return s.story.items[c.item] === true;
  if ('homeCity' in c) return s.rpg.city === c.homeCity;
  if ('timeOfDay' in c) return s.story.clock.timeOfDay === c.timeOfDay;
  if ('energy' in c) return s.rpg.energy >= c.energy;
  return false;
}

export function interpolate(s: GameState, text: string): string {
  return text.replace(/\{nome\}/g, s.rpg.name).replace(/\{cidade\}/g, s.rpg.city);
}

export function nodeText(s: GameState, node: DialogueNode): string {
  const v = node.variants?.find(x => evalCond(s, x.if));
  return interpolate(s, v ? v.text : node.text);
}

export function visibleChoices(s: GameState, node: DialogueNode): Array<{ choice: Choice; enabled: boolean }> {
  return (node.choices || []).filter(c => evalCond(s, c.showIf)).map(choice => ({ choice, enabled: evalCond(s, choice.requires) }));
}

function applyEffect(s: GameState, e: Effect, scene: Scene, rng: Rng): void {
  const st = s.story;
  switch (e.type) {
    case 'setFlag': st.flags[e.key] = e.value; break;
    case 'relation': {
      const r = st.relationships[e.npc];
      r.trust = clamp(r.trust + e.delta, -100, 100);
      if (e.state) r.state = e.state;
      break;
    }
    case 'trait': st.traits[e.trait] = clamp(st.traits[e.trait] + e.delta, -50, 50); break;
    case 'respect':
      // Recompensa só é aceita em cena única; nunca em conversa repetível.
      if (scene.once) grantRespect(s.rpg, e.amount, e.reason);
      break;
    case 'mission': {
      const prev = st.missions[e.id];
      st.missions[e.id] = { status: e.status, stage: e.stage ?? prev?.stage ?? null };
      if (e.status === 'active' || e.status === 'future') st.currentMissionId = e.id;
      else if (e.status === 'completed' && st.currentMissionId === e.id) {
        st.currentMissionId = Object.entries(st.missions).find(([, m]) => m.status === 'active')?.[0] ?? null;
      }
      const act = Number(/^A(\d)/.exec(e.id)?.[1]);
      if (e.status === 'active' && act >= 1 && act <= 5) st.act = act;
      break;
    }
    case 'stage': {
      const m = st.missions[e.mission];
      if (m) m.stage = e.stage;
      break;
    }
    case 'npc': st.npcs[e.id] = { present: e.present, spot: e.spot ?? st.npcs[e.id].spot }; break;
    case 'clock': st.clock = { label: e.label, timeOfDay: e.timeOfDay }; break;
    case 'item': st.items[e.id] = e.has; break;
    case 'log': log(s.rpg, e.msg); break;
    case 'trigger': if (!st.completedTriggers.includes(e.id)) st.completedTriggers.push(e.id); break;
    case 'energy': s.rpg.energy = clamp(s.rpg.energy + Math.min(0, e.delta), 0, 100); break;
    case 'heat': s.rpg.heat = clamp(s.rpg.heat + e.delta, 0, 100); break;
    case 'cash':
      if (scene.once && Number.isSafeInteger(e.amount) && e.amount > 0 && e.amount <= 1000) { s.rpg.cash += e.amount; log(s.rpg, `${e.reason} (+R$ ${e.amount})`); }
      break;
    case 'check': {
      const bonus = e.bonusFlag && (st.flags[e.bonusFlag] !== undefined && st.flags[e.bonusFlag] !== false) ? (e.bonus ?? 0) : 0;
      const chance = clamp(Math.round(e.base + s.rpg.stats[e.stat] * e.weight - s.rpg.heat * 0.4 + bonus), 15, 90);
      st.flags[e.key] = rng(1, 100) <= chance ? 'sucesso' : 'falha';
      st.flags[`${e.key}_chance`] = chance;
      break;
    }
  }
}

/** Aplica efeitos com IDs estáveis. Em cenas únicas, um ID já aplicado é ignorado. */
export function applyEffects(s: GameState, scene: Scene, effects: Effect[] | undefined, baseId: string, rng: Rng = cryptoRng): number {
  if (!effects?.length) return 0;
  let applied = 0;
  effects.forEach((e, i) => {
    const id = `${baseId}#${i}`;
    if (scene.once) {
      if (s.story.appliedEffectIds.includes(id)) return;
      s.story.appliedEffectIds.push(id);
    }
    applyEffect(s, e, scene, rng);
    applied++;
  });
  return applied;
}

export interface StoryResult { ok: boolean; msg?: string; ended?: boolean; openPanel?: PanelId }

function enterNode(s: GameState, scene: Scene, nodeId: string, rng: Rng): StoryResult {
  let id = nodeId;
  for (let guard = 0; guard < 30; guard++) {
    const node = scene.nodes.find(n => n.id === id);
    if (!node) return { ok: false, msg: `Nó inexistente: ${scene.id}/${id}` };
    applyEffects(s, scene, node.effects, `${scene.id}/${node.id}`, rng);
    if (node.branch) {
      const hit = node.branch.find(b => evalCond(s, b.if));
      if (hit) { id = hit.next; continue; }
      if (node.next && !node.text) { id = node.next; continue; }
    }
    s.story.activeDialogue = { sceneId: scene.id, nodeId: node.id };
    return { ok: true };
  }
  return { ok: false, msg: 'Ramificação circular.' };
}

function finishScene(s: GameState, scene: Scene, complete = true): StoryResult {
  s.story.activeDialogue = null;
  if (complete && scene.once && !s.story.completedScenes.includes(scene.id)) s.story.completedScenes.push(scene.id);
  return { ok: true, ended: true };
}

export function startScene(s: GameState, sceneId: string, rng: Rng = cryptoRng): StoryResult {
  const scene = getScene(sceneId);
  if (!scene) return { ok: false, msg: 'Cena inexistente.' };
  const active = s.story.activeDialogue;
  if (active) {
    if (active.sceneId === sceneId) return { ok: true }; // retomada
    return { ok: false, msg: 'Há uma conversa em andamento.' };
  }
  if (scene.once && s.story.completedScenes.includes(sceneId)) return { ok: false, msg: 'Essa cena já aconteceu.' };
  return enterNode(s, scene, scene.start, rng);
}

export function advance(s: GameState, expectedNodeId: string, rng: Rng = cryptoRng): StoryResult {
  const a = s.story.activeDialogue;
  if (!a || a.nodeId !== expectedNodeId) return { ok: false, msg: 'Diálogo desatualizado.' };
  const scene = getScene(a.sceneId)!;
  const node = getNode(a.sceneId, a.nodeId);
  if (!node) return { ok: false, msg: 'Nó inexistente.' };
  if (node.choices?.length && visibleChoices(s, node).length) return { ok: false, msg: 'Escolha uma opção.' };
  if (node.end || !node.next) return finishScene(s, scene);
  return enterNode(s, scene, node.next, rng);
}

export function choose(s: GameState, expectedNodeId: string, choiceId: string, rng: Rng = cryptoRng): StoryResult {
  const a = s.story.activeDialogue;
  if (!a || a.nodeId !== expectedNodeId) return { ok: false, msg: 'Diálogo desatualizado.' };
  const scene = getScene(a.sceneId)!;
  const node = getNode(a.sceneId, a.nodeId);
  const entry = node ? visibleChoices(s, node).find(x => x.choice.id === choiceId) : undefined;
  if (!node || !entry) return { ok: false, msg: 'Opção indisponível.' };
  if (!entry.enabled) return { ok: false, msg: entry.choice.requiresLabel || 'Requisito não atendido.' };
  const c = entry.choice;
  const base = `${scene.id}/${node.id}/${c.id}`;
  applyEffects(s, scene, c.effects, base, rng);
  if (c.memory && !(scene.once && s.story.choices.some(r => r.sceneId === scene.id && r.choiceId === c.id && r.nodeId === node.id))) {
    s.story.choices.push({ sceneId: scene.id, nodeId: node.id, choiceId: c.id, memory: c.memory, seasonDay: s.rpg.day, storyLabel: s.story.clock.label });
    s.story.choices = s.story.choices.slice(-300);
  }
  if (c.next === 'END') {
    const r = finishScene(s, scene, !c.defer);
    return { ...r, openPanel: c.openPanel };
  }
  const r = enterNode(s, scene, c.next, rng);
  return { ...r, openPanel: c.openPanel };
}

/** Saída segura de conversas repetíveis (Esc). Cenas únicas não podem ser abandonadas. */
export function dismiss(s: GameState): StoryResult {
  const a = s.story.activeDialogue;
  if (!a) return { ok: false };
  const scene = getScene(a.sceneId);
  if (!scene || scene.once) return { ok: false, msg: 'Esta conversa é importante: escolha como continuar.' };
  s.story.activeDialogue = null;
  return { ok: true, ended: true };
}

/** Diálogo ativo inválido (conteúdo removido numa atualização) é descartado com segurança. */
export function repairDialogue(s: GameState): void {
  const a = s.story.activeDialogue;
  if (a && !getNode(a.sceneId, a.nodeId)) s.story.activeDialogue = null;
}
