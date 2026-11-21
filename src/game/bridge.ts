/**
 * Barramento tipado entre o jogo (Phaser) e a interface (HTML).
 * Não carrega estado de carreira: apenas eventos de apresentação e pedidos de ação.
 */
import type { TargetId } from '../narrative/triggers';

export interface BridgeEvents {
  /** Alvo de interação mais próximo mudou (null = nenhum). */
  target: { id: TargetId; label: string } | null;
  /** Pedido de interação (tecla E/Espaço, botão ou toque). */
  interact: void;
  /** Uma cena terminou de carregar. */
  areaReady: { area: 'vila' | 'bar' | 'casa' | 'attract' };
  /** Transição de área começou. */
  transition: { to: 'vila' | 'bar' | 'casa' };
  /** Passo do protagonista (para o som). */
  step: { surface: 'rua' | 'piso' };
  /** Medição de FPS (somente leitura). */
  fps: number;
  /** Abrir painel de RPG a partir do mundo. */
  openPanel: string;
  /** Mensagem curta para o jogador. */
  toast: { msg: string; error?: boolean };
  /** O mundo pediu para iniciar uma cena de diálogo. */
  scene: string;
  /** Efeito sonoro pedido pelo mundo. */
  sfx: string;
  /** Falha de renderização (fallback). */
  renderError: string;
}

type Handler<T> = (payload: T) => void;

export class Bridge {
  private handlers = new Map<keyof BridgeEvents, Set<Handler<any>>>();
  on<K extends keyof BridgeEvents>(k: K, fn: Handler<BridgeEvents[K]>): () => void {
    if (!this.handlers.has(k)) this.handlers.set(k, new Set());
    this.handlers.get(k)!.add(fn);
    return () => this.handlers.get(k)!.delete(fn);
  }
  emit<K extends keyof BridgeEvents>(k: K, payload: BridgeEvents[K]): void {
    for (const fn of this.handlers.get(k) || []) {
      try { fn(payload); } catch (e) { console.error('[bridge]', k, e); }
    }
  }
}
