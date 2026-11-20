/**
 * Pinta e registra todas as texturas do jogo, em etapas (uma por quadro) para que a
 * tela de carregamento continue responsiva em celulares mais fracos.
 */
import Phaser from 'phaser';
import { FRAME_COUNT, FRAME_H, FRAME_W, NPC_LOOKS, PLAYER_LOOKS, paintSheet, type CharSpec } from '../../art/characters';
import { paintFacades, paintFar, paintGround, paintMid, paintMoon, paintSky, paintWires } from '../../art/vila';
import { paintBarRoom } from '../../art/bar';
import { paintProps } from '../../art/props';
import { ctx } from '../context';

export const artMeta: {
  facadeLights: Array<{ x: number; y: number; w: number; h: number; color?: string }>;
  farLights: Array<{ x: number; y: number; w: number; h: number; color?: string }>;
  midLights: Array<{ x: number; y: number; w: number; h: number }>;
  puddles: Array<{ x: number; y: number; w: number; h: number }>;
  neon: { x: number; y: number; w: number; h: number };
  barLights: Array<{ x: number; y: number }>;
  tv: { x: number; y: number; w: number; h: number };
} = { facadeLights: [], farLights: [], midLights: [], puddles: [], neon: { x: 0, y: 0, w: 0, h: 0 }, barLights: [], tv: { x: 0, y: 0, w: 0, h: 0 } };

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  private addSheet(key: string, spec: CharSpec) {
    const s = ctx().artScale;
    const canvas = paintSheet(spec, s);
    const tex = this.textures.addCanvas(key, canvas);
    if (!tex) return;
    const fw = Math.ceil(FRAME_W * s), fh = Math.ceil(FRAME_H * s);
    for (let f = 0; f < FRAME_COUNT; f++) tex.add(f, 0, f * fw, 0, fw, fh);
  }

  create() {
    const tasks: Array<[string, () => void]> = [
      ['Pintando o céu', () => {
        this.textures.addCanvas('ceu_entardecer', paintSky('entardecer'));
        this.textures.addCanvas('ceu_noite', paintSky('noite'));
        this.textures.addCanvas('lua', paintMoon());
      }],
      ['Levantando o morro', () => { const f = paintFar(); this.textures.addCanvas('morro', f.canvas); artMeta.farLights = f.lights; }],
      ['Erguendo os prédios', () => { const m = paintMid(); this.textures.addCanvas('predios', m.canvas); artMeta.midLights = m.lights; }],
      ['Pintando as fachadas', () => { const f = paintFacades(); this.textures.addCanvas('fachadas', f.canvas); artMeta.facadeLights = f.lights; artMeta.neon = f.neon; }],
      ['Assentando a calçada', () => { const g = paintGround(); this.textures.addCanvas('chao', g.canvas); artMeta.puddles = g.puddles; }],
      ['Esticando os fios', () => { this.textures.addCanvas('fios', paintWires()); }],
      ['Arrumando o bar', () => { const b = paintBarRoom(); this.textures.addCanvas('bar_sala', b.canvas); artMeta.barLights = b.lights; artMeta.tv = b.tv; }],
      ['Espalhando objetos', () => { for (const [k, c] of Object.entries(paintProps())) this.textures.addCanvas(k, c); }],
      ...PLAYER_LOOKS.map((p, i) => [`Vestindo protagonista ${i + 1}`, () => this.addSheet(`char_player${i}`, p)] as [string, () => void]),
      ...Object.entries(NPC_LOOKS).map(([id, spec]) => [`Chamando ${id}`, () => this.addSheet(`char_${id}`, spec)] as [string, () => void])
    ];
    const total = tasks.length;
    let i = 0;
    const step = () => {
      const t = tasks[i];
      if (!t) {
        this.createAnims();
        this.game.events.emit('boot-complete');
        return;
      }
      this.game.events.emit('boot-progress', { label: t[0], progress: i / total });
      try { t[1](); } catch (e) { console.error('[boot] falha ao pintar', t[0], e); }
      i++;
      this.time.delayedCall(0, step);
    };
    step();
  }

  private createAnims() {
    const keys = [...PLAYER_LOOKS.map((_, i) => `char_player${i}`), ...Object.keys(NPC_LOOKS).map(id => `char_${id}`)];
    for (const k of keys) {
      if (!this.textures.exists(k)) continue;
      const mk = (name: string, frames: number[], rate: number, repeat = -1) =>
        this.anims.create({ key: `${k}_${name}`, frames: frames.map(f => ({ key: k, frame: f })), frameRate: rate, repeat });
      mk('idle', [0, 1, 2, 3, 2, 1], 4);
      mk('walk', [4, 5, 6, 7, 8, 9, 10, 11], 11);
      mk('interact', [12, 13, 14, 13], 6);
      mk('phone', [15, 16], 1.5);
    }
    for (let f = 0; f < 4; f++) if (!this.textures.exists(`ventilador${f}`)) return;
    this.anims.create({ key: 'ventilador', frames: [0, 1, 2, 3].map(f => ({ key: `ventilador${f}` })), frameRate: 14, repeat: -1 });
  }
}
