/**
 * Estado autoritativo de Marginalidade RPG (schema próprio, versão 1).
 * Uma carreira = rpg (regras legadas) + story (campanha) + world (posição) + profile.
 */
import { HOME_CITIES, MAXDAY } from './legacy/data';
import { defaultRpgState, normalizeRpg, validateRpg, type RpgState } from './legacy/state';
import { sanitizeName } from './legacy/actions';
import type { FlagValue, MissionStatus, NpcId, RelationState, TimeOfDay, TraitId } from '../narrative/types';

export const GAME_ID = 'marginalidade_rpg';
export const SCHEMA_VERSION = 1;
export const STORY_VERSION = 1;

export type AreaId = 'vila' | 'bar' | 'casa';
export const AREA_IDS: AreaId[] = ['vila', 'bar', 'casa'];
export type Appearance = 0 | 1 | 2;

export interface Relationship { trust: number; state: RelationState }
export interface ChoiceRecord { sceneId: string; nodeId: string; choiceId: string; memory: string; seasonDay: number; storyLabel: string }
export interface NpcState { present: boolean; spot: string }

export interface StoryState {
  version: number;
  act: number;
  currentMissionId: string | null;
  missions: Record<string, { status: MissionStatus; stage: string | null }>;
  flags: Record<string, FlagValue>;
  items: Record<string, boolean>;
  relationships: Record<NpcId, Relationship>;
  traits: Record<TraitId, number>;
  choices: ChoiceRecord[];
  appliedEffectIds: string[];
  completedTriggers: string[];
  completedScenes: string[];
  activeDialogue: { sceneId: string; nodeId: string } | null;
  clock: { label: string; timeOfDay: TimeOfDay };
  npcs: Record<NpcId, NpcState>;
  introSeen: boolean;
}

export interface WorldState { city: 'Rio de Janeiro'; hub: 'vila_do_dique'; area: AreaId; x: number; y: number; facing: 1 | -1 }

export interface GameState {
  game: typeof GAME_ID;
  schema: typeof SCHEMA_VERSION;
  createdAt: string;
  updatedAt: string;
  profile: { appearance: Appearance };
  world: WorldState;
  rpg: RpgState;
  story: StoryState;
}

export const NPC_IDS: NpcId[] = ['magrao', 'lia', 'solange', 'miro', 'nando', 'ze'];
export const TRAITS: TraitId[] = ['lealdade', 'ambicao', 'humanidade'];
const RELATION_STATES: RelationState[] = ['neutro', 'confianca', 'distancia', 'conflito', 'rompimento'];

export const VILA_SPAWN = { x: 470, y: 640 };

export function defaultStory(): StoryState {
  return {
    version: STORY_VERSION,
    act: 1,
    currentMissionId: 'A1-M01',
    missions: {
      'A1-M01': { status: 'active', stage: 'talk_magrao' },
      'A1-M02': { status: 'locked', stage: null }
    },
    flags: {},
    items: {},
    relationships: {
      magrao: { trust: 20, state: 'confianca' },
      lia: { trust: 25, state: 'confianca' },
      solange: { trust: 5, state: 'neutro' },
      miro: { trust: -10, state: 'distancia' },
      nando: { trust: 5, state: 'neutro' },
      ze: { trust: 0, state: 'neutro' }
    },
    traits: { lealdade: 0, ambicao: 0, humanidade: 0 },
    choices: [],
    appliedEffectIds: [],
    completedTriggers: [],
    completedScenes: [],
    activeDialogue: null,
    clock: { label: 'Sexta-feira, 18h10', timeOfDay: 'entardecer' },
    npcs: {
      magrao: { present: true, spot: 'oficina' },
      lia: { present: true, spot: 'casa' },
      solange: { present: true, spot: 'mercearia' },
      miro: { present: false, spot: 'bar_mesa' },
      nando: { present: true, spot: 'balcao' },
      ze: { present: true, spot: 'bar_canto' }
    },
    introSeen: false
  };
}

export function newGame(name: string, homeCity: string, appearance: Appearance, now = new Date()): GameState {
  const rpg = defaultRpgState(name, homeCity);
  return {
    game: GAME_ID,
    schema: SCHEMA_VERSION,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    profile: { appearance },
    world: { city: 'Rio de Janeiro', hub: 'vila_do_dique', area: 'vila', x: VILA_SPAWN.x, y: VILA_SPAWN.y, facing: 1 },
    rpg,
    story: defaultStory()
  };
}

/* ----------------------------- Validação ----------------------------- */

const isObj = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown, max = 60): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && /^[A-Za-z0-9_\-:.\/]+$/.test(v);
const isText = (v: unknown, max = 300): v is string => typeof v === 'string' && v.length <= max;
const isFlagValue = (v: unknown): v is FlagValue =>
  typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 60);

export interface ValidationResult { ok: boolean; reason?: string }

/** Validação estrutural completa de um save do Marginalidade RPG (qualquer origem: localStorage ou arquivo). */
export function validateGameState(obj: unknown): ValidationResult {
  if (!isObj(obj)) return { ok: false, reason: 'O conteúdo não é um objeto de save.' };
  if (obj.game !== GAME_ID) return { ok: false, reason: 'Este save não pertence ao Marginalidade RPG.' };
  if (!Number.isInteger(obj.schema)) return { ok: false, reason: 'Versão do save ausente.' };
  if (obj.schema > SCHEMA_VERSION) return { ok: false, reason: 'Este save foi criado por uma versão mais nova do jogo.' };
  if (!validateRpg(obj.rpg)) return { ok: false, reason: 'Dados de carreira inválidos.' };
  if (!(HOME_CITIES as readonly string[]).includes(obj.rpg.city)) return { ok: false, reason: 'Cidade de origem desconhecida.' };
  if (!isObj(obj.world) || !AREA_IDS.includes(obj.world.area) || !Number.isFinite(obj.world.x) || !Number.isFinite(obj.world.y))
    return { ok: false, reason: 'Posição no mapa inválida.' };
  if (!isObj(obj.profile) || ![0, 1, 2].includes(obj.profile.appearance)) return { ok: false, reason: 'Perfil inválido.' };
  const st = obj.story;
  if (!isObj(st)) return { ok: false, reason: 'Progresso da história ausente.' };
  if (!isObj(st.flags) || Object.keys(st.flags).length > 500) return { ok: false, reason: 'Marcadores de história inválidos.' };
  for (const [k, v] of Object.entries(st.flags)) if (!isId(k) || !isFlagValue(v)) return { ok: false, reason: 'Marcador de história inválido.' };
  if (!isObj(st.missions)) return { ok: false, reason: 'Missões inválidas.' };
  for (const [k, v] of Object.entries(st.missions)) {
    if (!isId(k) || !isObj(v) || !['locked', 'active', 'completed', 'future'].includes(v.status) || !(v.stage === null || isId(v.stage)))
      return { ok: false, reason: 'Estado de missão inválido.' };
  }
  if (!Array.isArray(st.appliedEffectIds) || st.appliedEffectIds.length > 5000 || !st.appliedEffectIds.every((x: unknown) => isText(x, 200)))
    return { ok: false, reason: 'Registro de efeitos inválido.' };
  if (!Array.isArray(st.choices) || st.choices.length > 1000) return { ok: false, reason: 'Histórico de escolhas inválido.' };
  for (const c of st.choices) if (!isObj(c) || !isId(c.sceneId) || !isId(c.choiceId) || !isText(c.memory)) return { ok: false, reason: 'Escolha registrada inválida.' };
  if (st.activeDialogue !== null && st.activeDialogue !== undefined && !(isObj(st.activeDialogue) && isId(st.activeDialogue.sceneId) && isId(st.activeDialogue.nodeId)))
    return { ok: false, reason: 'Diálogo ativo inválido.' };
  return { ok: true };
}

/** Normaliza um save válido (preenche campos ausentes com padrão; força limites). */
export function normalizeGameState(raw: GameState): GameState {
  const base = defaultStory();
  const s = raw.story as Partial<StoryState> & Record<string, any>;
  const rel = {} as Record<NpcId, Relationship>;
  for (const id of NPC_IDS) {
    const r = isObj(s.relationships) ? s.relationships[id] : undefined;
    rel[id] = isObj(r) && Number.isFinite(r.trust) && RELATION_STATES.includes(r.state)
      ? { trust: Math.max(-100, Math.min(100, Math.round(r.trust))), state: r.state }
      : base.relationships[id];
  }
  const traits = {} as Record<TraitId, number>;
  for (const t of TRAITS) traits[t] = isObj(s.traits) && Number.isFinite(s.traits[t]) ? Math.max(-50, Math.min(50, Math.round(s.traits[t]))) : 0;
  const npcs = {} as Record<NpcId, NpcState>;
  for (const id of NPC_IDS) {
    const n = isObj(s.npcs) ? s.npcs[id] : undefined;
    npcs[id] = isObj(n) && typeof n.present === 'boolean' && isId(n.spot) ? { present: n.present, spot: n.spot } : base.npcs[id];
  }
  const items: Record<string, boolean> = {};
  if (isObj(s.items)) for (const [k, v] of Object.entries(s.items)) if (isId(k) && typeof v === 'boolean') items[k] = v;
  const strList = (v: unknown, max: number) => Array.isArray(v) ? v.filter(x => isText(x, 200)).slice(-max) as string[] : [];
  const story: StoryState = {
    version: STORY_VERSION,
    act: Number.isInteger(s.act) && s.act! >= 1 && s.act! <= 5 ? s.act! : 1,
    currentMissionId: s.currentMissionId === null || isId(s.currentMissionId) ? (s.currentMissionId ?? null) : base.currentMissionId,
    missions: { ...base.missions, ...(s.missions || {}) },
    flags: { ...(s.flags || {}) },
    items,
    relationships: rel,
    traits,
    choices: (s.choices || []).slice(-300).map((c: ChoiceRecord) => ({
      sceneId: c.sceneId, nodeId: String(c.nodeId || ''), choiceId: c.choiceId, memory: String(c.memory),
      seasonDay: Number.isInteger(c.seasonDay) ? c.seasonDay : 1, storyLabel: isText(c.storyLabel, 80) ? c.storyLabel : ''
    })),
    appliedEffectIds: strList(s.appliedEffectIds, 5000),
    completedTriggers: strList(s.completedTriggers, 1000),
    completedScenes: strList(s.completedScenes, 1000),
    activeDialogue: s.activeDialogue ? { sceneId: s.activeDialogue.sceneId, nodeId: s.activeDialogue.nodeId } : null,
    clock: isObj(s.clock) && isText(s.clock.label, 60) && ['entardecer', 'noite'].includes(s.clock.timeOfDay) ? { label: s.clock.label, timeOfDay: s.clock.timeOfDay } : base.clock,
    npcs,
    introSeen: s.introSeen === true
  };
  const w = raw.world;
  return {
    game: GAME_ID,
    schema: SCHEMA_VERSION,
    createdAt: isText(raw.createdAt, 40) ? raw.createdAt : new Date().toISOString(),
    updatedAt: isText(raw.updatedAt, 40) ? raw.updatedAt : new Date().toISOString(),
    profile: { appearance: raw.profile.appearance },
    world: {
      city: 'Rio de Janeiro', hub: 'vila_do_dique', area: w.area,
      x: Math.max(0, Math.min(4000, w.x)), y: Math.max(0, Math.min(2000, w.y)), facing: w.facing === -1 ? -1 : 1
    },
    rpg: cleanNames(normalizeRpg(raw.rpg)),
    story
  };
}

/** Defesa em profundidade: nomes vindos de saves/arquivos nunca carregam marcação. */
function cleanNames(r: RpgState): RpgState {
  const name = sanitizeName(r.name);
  r.name = name.length >= 2 ? name.slice(0, 22) : 'Sem nome';
  if (r.gangName) { const g = sanitizeName(r.gangName); r.gangName = g.length >= 3 ? g.slice(0, 25) : 'Grupo'; }
  return r;
}

/**
 * Migrações de schema. A v0.1 inaugura o schema 1; a tabela já existe para que a v0.2
 * acrescente `2: (s) => ...` sem reescrever o carregamento. Cada passo recebe o objeto da
 * versão N e devolve o da versão N+1.
 */
export const MIGRATIONS: Record<number, (s: Record<string, any>) => Record<string, any>> = {};

export function migrate(raw: Record<string, any>): Record<string, any> {
  let cur = raw;
  let guard = 0;
  while (Number.isInteger(cur.schema) && cur.schema < SCHEMA_VERSION && guard++ < 50) {
    const step = MIGRATIONS[cur.schema];
    if (!step) throw new Error(`Sem migração do schema ${cur.schema}`);
    cur = step(cur);
  }
  return cur;
}

/** Pipeline completo para dados vindos de fora: migra → valida → normaliza. */
export function parseGameState(obj: unknown): { state: GameState | null; reason?: string } {
  if (!isObj(obj)) return { state: null, reason: 'Conteúdo inválido.' };
  let migrated: Record<string, any>;
  try { migrated = migrate(obj); } catch { return { state: null, reason: 'Não foi possível migrar este save.' }; }
  const v = validateGameState(migrated);
  if (!v.ok) return { state: null, reason: v.reason };
  return { state: normalizeGameState(migrated as GameState) };
}

export { MAXDAY };
