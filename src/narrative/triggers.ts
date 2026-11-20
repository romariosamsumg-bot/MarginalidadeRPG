/**
 * Decide o que acontece ao interagir com um alvo do mapa, a partir do estado.
 * Pura e testável: o mundo (Phaser) só pergunta; quem muda o estado é o store.
 */
import type { GameState } from '../core/state';
import type { PanelId } from './types';

export type InteractionOutcome =
  | { kind: 'scene'; sceneId: string }
  | { kind: 'panel'; tab: PanelId }
  | { kind: 'door'; to: 'vila' | 'bar' }
  | { kind: 'none'; msg: string };

export type TargetId =
  | 'magrao' | 'lia' | 'solange' | 'miro' | 'nando' | 'ze'
  | 'casa' | 'oficina' | 'mural' | 'bar_porta' | 'loja' | 'mercearia' | 'ponto'
  | 'bar_saida' | 'tv';

const stageIs = (s: GameState, mission: string, stage: string) =>
  s.story.missions[mission]?.status === 'active' && s.story.missions[mission]?.stage === stage;

export function resolveInteraction(s: GameState, target: TargetId): InteractionOutcome {
  switch (target) {
    case 'magrao':
      if (stageIs(s, 'A1-M01', 'talk_magrao')) return { kind: 'scene', sceneId: 'A1-M01-oficina' };
      return { kind: 'scene', sceneId: 'bark-magrao' };
    case 'casa':
      if (stageIs(s, 'A1-M01', 'store_package') || stageIs(s, 'A1-M01', 'go_home')) return { kind: 'scene', sceneId: 'A1-M01-casa' };
      return { kind: 'panel', tab: 'temporada' };
    case 'lia': return { kind: 'scene', sceneId: 'bark-lia' };
    case 'solange': return { kind: 'scene', sceneId: 'bark-solange' };
    case 'nando': return { kind: 'scene', sceneId: 'bark-nando' };
    case 'ze': return { kind: 'scene', sceneId: 'bark-ze' };
    case 'miro':
      if (stageIs(s, 'A1-M02', 'go_bar') || stageIs(s, 'A1-M02', 'confront')) return { kind: 'scene', sceneId: 'A1-M02-cobranca' };
      return { kind: 'scene', sceneId: 'bark-miro' };
    case 'oficina': return { kind: 'scene', sceneId: 'poi-oficina' };
    case 'tv': return { kind: 'scene', sceneId: 'poi-tv' };
    case 'mural': return { kind: 'panel', tab: 'missoes' };
    case 'mercearia': return { kind: 'panel', tab: 'economia' };
    case 'loja': return { kind: 'panel', tab: 'economia' };
    case 'ponto': return { kind: 'panel', tab: 'cidade' };
    case 'bar_porta': return { kind: 'door', to: 'bar' };
    case 'bar_saida': return { kind: 'door', to: 'vila' };
  }
  return { kind: 'none', msg: 'Nada a fazer aqui.' };
}

/** O bar dispara a cobrança automaticamente na chegada, durante A1-M02. */
export function barAutoScene(s: GameState): string | null {
  if (stageIs(s, 'A1-M02', 'go_bar') || stageIs(s, 'A1-M02', 'confront')) return 'A1-M02-cobranca';
  return null;
}

/** A introdução roda uma única vez por carreira. */
export function introPending(s: GameState): boolean {
  return s.story.flags['intro_seen'] !== true && !s.story.completedScenes.includes('A1-intro');
}

/** Rótulos de ação contextual mostrados no botão Interagir. */
export function interactionLabel(s: GameState, target: TargetId, name: string): string {
  const o = resolveInteraction(s, target);
  if (o.kind === 'door') return o.to === 'bar' ? 'Entrar no bar' : 'Sair para a rua';
  if (o.kind === 'panel') {
    const map: Partial<Record<PanelId, string>> = { temporada: 'Descansar e planejar', missoes: 'Ver mural de serviços', economia: target === 'loja' ? 'Ver ponto comercial' : 'Correspondente bancário', cidade: 'Pegar condução' };
    return map[o.tab] || 'Abrir';
  }
  if (target === 'oficina' || target === 'tv') return 'Observar';
  if (target === 'casa') return 'Entrar em casa';
  return `Falar com ${name}`;
}
