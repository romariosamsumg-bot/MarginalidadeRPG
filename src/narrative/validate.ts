/**
 * Validador automático do conteúdo narrativo (Bíblia 10.1): IDs repetidos, destinos
 * inexistentes, nós sem saída, ciclos sem escolha, tipos de efeito fora da lista e
 * recompensas em cenas repetíveis. Executado nos testes (tests/narrative.test.ts).
 */
import { EFFECT_TYPES, type Effect, type Scene } from './types';
import { ALL_MISSIONS } from './content/campaign';

const MAX_CHOICES = 3;

export function validateScenes(scenes: Scene[]): string[] {
  const errors: string[] = [];
  const sceneIds = new Set<string>();
  const missionIds = new Set(ALL_MISSIONS.map(m => m.id));
  for (const scene of scenes) {
    if (sceneIds.has(scene.id)) errors.push(`Cena duplicada: ${scene.id}`);
    sceneIds.add(scene.id);
    if (scene.mission && !missionIds.has(scene.mission)) errors.push(`${scene.id}: missão desconhecida ${scene.mission}`);
    const nodeIds = new Set<string>();
    for (const n of scene.nodes) {
      if (nodeIds.has(n.id)) errors.push(`${scene.id}: nó duplicado ${n.id}`);
      nodeIds.add(n.id);
    }
    if (!nodeIds.has(scene.start)) errors.push(`${scene.id}: início inexistente ${scene.start}`);
    const checkEffects = (effects: Effect[] | undefined, where: string) => {
      for (const e of effects || []) {
        if (!(EFFECT_TYPES as readonly string[]).includes(e.type)) errors.push(`${where}: efeito não permitido ${(e as { type: string }).type}`);
        if (e.type === 'respect' && !scene.once) errors.push(`${where}: recompensa em cena repetível`);
        if (e.type === 'respect' && (e.amount <= 0 || e.amount > 10)) errors.push(`${where}: recompensa fora da escala`);
        if ((e.type === 'mission') && !missionIds.has(e.id)) errors.push(`${where}: missão desconhecida ${e.id}`);
        if ((e.type === 'stage') && !missionIds.has(e.mission)) errors.push(`${where}: missão desconhecida ${e.mission}`);
        if (e.type === 'stage' || (e.type === 'mission' && e.stage)) {
          const mid = e.type === 'stage' ? e.mission : e.id;
          const stage = e.type === 'stage' ? e.stage : e.stage!;
          const def = ALL_MISSIONS.find(m => m.id === mid);
          if (def && !def.stages[stage]) errors.push(`${where}: etapa inexistente ${mid}/${stage}`);
        }
      }
    };
    for (const n of scene.nodes) {
      const where = `${scene.id}/${n.id}`;
      const targets: string[] = [];
      if (n.next) targets.push(n.next);
      for (const b of n.branch || []) targets.push(b.next);
      for (const c of n.choices || []) if (c.next !== 'END') targets.push(c.next);
      for (const t of targets) if (!nodeIds.has(t)) errors.push(`${where}: destino inexistente ${t}`);
      const hasExit = !!n.end || !!n.next || !!(n.choices && n.choices.length);
      if (!hasExit && !n.branch) errors.push(`${where}: nó sem saída`);
      if (n.branch && !n.next && !n.end) errors.push(`${where}: ramificação sem caminho padrão`);
      if (!n.branch && !n.text && n.style !== 'phone') errors.push(`${where}: nó sem texto`);
      if ((n.choices?.length || 0) > MAX_CHOICES) errors.push(`${where}: mais de ${MAX_CHOICES} opções`);
      if (n.choices) {
        const ids = new Set<string>();
        for (const c of n.choices) {
          if (ids.has(c.id)) errors.push(`${where}: opção duplicada ${c.id}`);
          ids.add(c.id);
          checkEffects(c.effects, `${where}/${c.id}`);
        }
        // Garantia de justiça: ao menos uma opção sem requisito.
        if (!n.choices.some(c => !c.requires)) errors.push(`${where}: todas as opções têm requisito (possível bloqueio)`);
      }
      checkEffects(n.effects, where);
    }
    // Alcançabilidade e término: todo nó alcançável precisa conseguir chegar a um fim.
    const reach = new Set<string>();
    const stack = [scene.start];
    while (stack.length) {
      const id = stack.pop()!;
      if (reach.has(id)) continue;
      reach.add(id);
      const n = scene.nodes.find(x => x.id === id);
      if (!n) continue;
      if (n.next) stack.push(n.next);
      for (const b of n.branch || []) stack.push(b.next);
      for (const c of n.choices || []) if (c.next !== 'END') stack.push(c.next);
    }
    for (const n of scene.nodes) if (!reach.has(n.id)) errors.push(`${scene.id}/${n.id}: nó inalcançável`);
    const canEnd = new Map<string, boolean>();
    const ends = (id: string, seen: Set<string>): boolean => {
      if (canEnd.has(id)) return canEnd.get(id)!;
      if (seen.has(id)) return false;
      seen.add(id);
      const n = scene.nodes.find(x => x.id === id);
      if (!n) return false;
      const r = !!n.end || !!n.choices?.some(c => c.next === 'END')
        || (n.next ? ends(n.next, seen) : false)
        || (n.branch || []).some(b => ends(b.next, seen))
        || (n.choices || []).some(c => c.next !== 'END' && ends(c.next, seen));
      canEnd.set(id, r);
      return r;
    };
    for (const id of reach) if (!ends(id, new Set())) errors.push(`${scene.id}/${id}: não leva a um final`);
  }
  return errors;
}
