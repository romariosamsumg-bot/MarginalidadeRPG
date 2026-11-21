/**
 * Decide o que acontece ao interagir com um alvo do mapa, a partir do estado.
 * Pura e testável: o mundo (Phaser) só pergunta; quem muda o estado é o store.
 */
import type { AreaId, GameState } from '../core/state';
import type { PanelId } from './types';
import { DOORS } from '../world/layout';

export type InteractionOutcome =
  | { kind: 'scene'; sceneId: string }
  | { kind: 'panel'; tab: PanelId }
  | { kind: 'door'; to: AreaId; spawn: string }
  | { kind: 'none'; msg: string };

export type TargetId =
  | 'magrao' | 'lia' | 'solange' | 'miro' | 'nando' | 'ze'
  | 'casa' | 'oficina' | 'mural' | 'bar_porta' | 'loja' | 'mercearia' | 'ponto'
  | 'bar_saida' | 'tv' | 'sofa' | 'saida_casa';

export const stageIs = (s: GameState, mission: string, stage: string) =>
  s.story.missions[mission]?.status === 'active' && s.story.missions[mission]?.stage === stage;

const door = (id: string): InteractionOutcome => {
  const d = DOORS[id]!;
  return { kind: 'door', to: d.to, spawn: d.spawn };
};

export function resolveInteraction(s: GameState, target: TargetId): InteractionOutcome {
  switch (target) {
    case 'magrao':
      if (stageIs(s, 'A1-M01', 'talk_magrao')) return { kind: 'scene', sceneId: 'A1-M01-oficina' };
      return { kind: 'scene', sceneId: 'bark-magrao' };
    case 'casa':
      if (stageIs(s, 'A1-M01', 'store_package') || stageIs(s, 'A1-M01', 'go_home')) return { kind: 'scene', sceneId: 'A1-M01-casa' };
      if (stageIs(s, 'A1-M03', 'go_home')) return { kind: 'scene', sceneId: 'A1-M03-domingo' };
      return door('casa');
    case 'lia':
      if (stageIs(s, 'A1-M03', 'talk_lia')) return { kind: 'scene', sceneId: 'A1-M03-lia' };
      return { kind: 'scene', sceneId: 'bark-lia' };
    case 'solange':
      if (stageIs(s, 'A1-M03', 'talk_solange')) return { kind: 'scene', sceneId: 'A1-M03-solange' };
      return { kind: 'scene', sceneId: 'bark-solange' };
    case 'nando': return { kind: 'scene', sceneId: 'bark-nando' };
    case 'ze': return { kind: 'scene', sceneId: 'bark-ze' };
    case 'miro':
      if (stageIs(s, 'A1-M02', 'go_bar') || stageIs(s, 'A1-M02', 'confront')) return { kind: 'scene', sceneId: 'A1-M02-cobranca' };
      if (stageIs(s, 'A1-M04', 'meet')) return { kind: 'scene', sceneId: 'A1-M04-servico' };
      if (stageIs(s, 'A1-M05', 'meet_miro')) return { kind: 'scene', sceneId: 'A1-M05-oferta' };
      return { kind: 'scene', sceneId: 'bark-miro' };
    case 'oficina': return { kind: 'scene', sceneId: 'poi-oficina' };
    case 'tv': return { kind: 'scene', sceneId: 'poi-tv' };
    case 'mural': return { kind: 'panel', tab: 'missoes' };
    case 'mercearia': return { kind: 'panel', tab: 'economia' };
    case 'loja': return { kind: 'panel', tab: 'economia' };
    case 'ponto': return { kind: 'panel', tab: 'cidade' };
    case 'sofa': return { kind: 'panel', tab: 'temporada' };
    case 'bar_porta': case 'bar_saida': case 'saida_casa': return door(target);
  }
  return { kind: 'none', msg: 'Nada a fazer aqui.' };
}

/** Cenas que disparam sozinhas ao entrar no bar (A1-M02 e a crise de A1-M05). */
export function barAutoScene(s: GameState): string | null {
  if (stageIs(s, 'A1-M02', 'go_bar') || stageIs(s, 'A1-M02', 'confront')) return 'A1-M02-cobranca';
  if (stageIs(s, 'A1-M05', 'go_bar')) return 'A1-M05-crise';
  return null;
}

/** A introdução roda uma única vez por carreira. */
export function introPending(s: GameState): boolean {
  return s.story.flags['intro_seen'] !== true && !s.story.completedScenes.includes('A1-intro');
}

/** Rótulos de ação contextual mostrados no botão Interagir. */
export function interactionLabel(s: GameState, target: TargetId, name: string): string {
  const o = resolveInteraction(s, target);
  if (o.kind === 'door') return o.to === 'bar' ? 'Entrar no bar' : o.to === 'casa' ? 'Entrar em casa' : 'Sair para a rua';
  if (o.kind === 'panel') {
    const map: Partial<Record<PanelId, string>> = { temporada: target === 'sofa' ? 'Descansar no sofá' : 'Descansar e planejar', missoes: 'Ver mural de serviços', economia: target === 'loja' ? 'Ver ponto comercial' : 'Correspondente bancário', cidade: 'Pegar condução' };
    return map[o.tab] || 'Abrir';
  }
  if (target === 'oficina' || target === 'tv') return 'Observar';
  if (target === 'casa') return 'Entrar em casa';
  return `Falar com ${name}`;
}
