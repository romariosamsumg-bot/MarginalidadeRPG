/** Dependências compartilhadas entre cenas Phaser (injetadas por main.ts). */
import type { Store } from '../core/store';
import type { Settings } from '../persistence/settings';
import type { Bridge } from './bridge';

export interface GameContext {
  store: Store;
  bridge: Bridge;
  settings: () => Settings;
  reducedMotion: () => boolean;
  /** Pixels de arte por unidade lógica (qualidade da pintura dos personagens). */
  artScale: number;
}

let current: GameContext | null = null;
export const setContext = (c: GameContext) => { current = c; };
export const ctx = (): GameContext => { if (!current) throw new Error('Contexto do jogo não inicializado'); return current; };
