/**
 * Cria o jogo Phaser e mantém o canvas com a resolução interna adequada:
 * tamanho CSS × fator de resolução (limitado pela qualidade e por um teto de pixels).
 */
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene, type WorldData } from './scenes/WorldScene';
import type { Quality } from '../persistence/settings';

export function hasCanvasSupport(): boolean {
  try { const c = document.createElement('canvas'); return !!c.getContext('2d'); } catch { return false; }
}
export function hasWebGL(): boolean {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export function renderScale(q: Quality): number {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  let rs = q === 'baixa' ? Math.min(dpr, 1) * 0.8 : q === 'alta' ? Math.min(dpr, 2) : Math.min(dpr, 1.5);
  const MAX_PIXELS = q === 'alta' ? 4_200_000 : 2_600_000;
  while (w * h * rs * rs > MAX_PIXELS && rs > 0.6) rs -= 0.05;
  return rs;
}

export function artScaleFor(q: Quality): number { return q === 'baixa' ? 1.25 : q === 'alta' ? 2 : 1.6; }

export interface GameHandle {
  game: Phaser.Game;
  renderer: 'webgl' | 'canvas';
  resize(): void;
  startWorld(data: WorldData): void;
  world(): WorldScene | null;
}

export function createGame(parent: HTMLElement, quality: () => Quality, forceCanvas: boolean, onProgress?: (label: string, p: number) => void): Promise<GameHandle> {
  return new Promise((resolve, reject) => {
    const rs = renderScale(quality());
    const w = Math.round(window.innerWidth * rs), h = Math.round(window.innerHeight * rs);
    let game: Phaser.Game;
    try {
      game = new Phaser.Game({
        type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
        parent,
        width: w, height: h,
        backgroundColor: '#05090b',
        banner: false,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
        audio: { noAudio: true },
        input: { keyboard: false, gamepad: false },
        render: { antialias: true, powerPreference: 'high-performance' },
        fps: { target: 60, smoothStep: false }, // delta real: velocidade constante mesmo em FPS baixo (ver docs/DECISOES.md)
        scene: [BootScene, WorldScene]
      });
    } catch (e) { reject(e); return; }
    if (onProgress) game.events.on('boot-progress', (e: { label: string; progress: number }) => onProgress(e.label, e.progress));
    const t = window.setTimeout(() => reject(new Error('O motor gráfico não respondeu a tempo.')), 25_000);
    const handle: GameHandle = {
      game,
      renderer: 'webgl',
      resize() {
        const r = renderScale(quality());
        const nw = Math.max(64, Math.round(window.innerWidth * r)), nh = Math.max(64, Math.round(window.innerHeight * r));
        if (game.scale.gameSize.width !== nw || game.scale.gameSize.height !== nh) game.scale.setGameSize(nw, nh);
        game.scale.refresh();
      },
      startWorld(data) {
        const sm = game.scene;
        if (sm.isActive('World') || sm.isPaused('World') || sm.isSleeping('World')) sm.getScene('World')!.scene.restart(data);
        else sm.start('World', data);
      },
      world() { const s = game.scene.getScene('World') as WorldScene | null; return s && s.sys.isActive() ? s : null; }
    };
    game.events.once('boot-complete', () => {
      clearTimeout(t);
      handle.renderer = game.renderer.type === Phaser.WEBGL ? 'webgl' : 'canvas';
      resolve(handle);
    });
  });
}
