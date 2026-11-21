/**
 * Cena de exploração (Vila do Dique ou interior do Bar do Nando).
 *
 * Profundidade 2.5D:
 *  - Colisão apenas pela "pegada" (zona nos pés); fachadas e objetos sólidos são zonas estáticas.
 *  - Y-sorting: profundidade de personagens e objetos = y da base.
 *  - Escala discreta por perspectiva (mais perto da câmera = um pouco maior).
 *  - Parallax manual calculado a partir da janela de visão (estável com zoom).
 *
 * Estado: a cena NUNCA guarda atributos de carreira; lê o store e despacha ações.
 */
import Phaser from 'phaser';
import { AREAS, EXIT_TO, type AreaLayout, type InteractDef, type NpcSpot } from '../../world/layout';
import { ctx } from '../context';
import { input } from '../input';
import { artMeta } from './BootScene';
import { barAutoScene, interactionLabel, resolveInteraction, stageIs, type TargetId } from '../../narrative/triggers';
import { currentObjective } from '../../narrative/content/campaign';
import { defaultStory, type AreaId, type GameState, type StoryState } from '../../core/state';
import { GROUND_Y } from '../../art/vila';
import { FRAME_H } from '../../art/characters';
import type { NpcId } from '../../narrative/types';
import { findPath, obstacles } from '../../world/path';
import { PANORAMA } from '../../art/assets';

type Mode = 'play' | 'attract';
export interface WorldData { area: AreaId; mode: Mode }

const FEET_ORIGIN_Y = 128 / FRAME_H;
const SPEED = 175;
const DEPTH = { sky: -1000, far: -950, mid: -900, ground: -800, facade: -700, facadeFx: -690, wires: -600, overlay: 1500, glow: 1600, fg: 2400, rain: 2500, ui: 3500 };
const OVERLAY = { entardecer: 0xd6b39c, noite: 0x7184ad, bar: 0xe8d4ba };

interface Layer { img: Phaser.GameObjects.Image; f: number; ox: number; oy: number }

class Actor {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  key: string;
  facing: 1 | -1 = 1;
  anim = '';
  balloon?: Phaser.GameObjects.Image;
  hidden = false;
  constructor(public scene: WorldScene, key: string, x: number, y: number) {
    this.key = key;
    this.shadow = scene.add.image(x, y, 'sombra').setAlpha(0.55);
    this.sprite = scene.add.sprite(x, y, key, 0).setOrigin(0.5, FEET_ORIGIN_Y);
    this.play('idle');
    this.place(x, y);
  }
  play(name: 'idle' | 'walk' | 'interact' | 'phone', rate?: number) {
    const k = `${this.key}_${name}`;
    if (this.anim !== k) { this.sprite.play(k); this.anim = k; }
    if (rate) this.sprite.anims.timeScale = rate;
    else this.sprite.anims.timeScale = 1;
  }
  face(dir: 1 | -1) { this.facing = dir; this.sprite.setFlipX(dir < 0); }
  place(x: number, y: number) {
    const s = this.scene.perspective(y);
    this.sprite.setPosition(x, y).setScale(s / (artMeta.sheetScale[this.key] ?? ctx().artScale)).setDepth(y);
    this.shadow.setPosition(x, y + 1).setScale(s * 0.9, s).setDepth(y - 0.5);
  }
  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}

class Npc extends Actor {
  timer = 1 + Math.random() * 2;
  walkTo: { x: number; y: number; then?: () => void } | null = null;
  leaving = false;
  constructor(scene: WorldScene, public id: NpcId | string, key: string, public spot: NpcSpot) {
    super(scene, key, spot.x, spot.y);
    this.face(spot.facing ?? 1);
  }
  update(dt: number, px: number, py: number, talking: boolean) {
    if (this.walkTo) {
      const dx = this.walkTo.x - this.x, dy = this.walkTo.y - this.y, d = Math.hypot(dx, dy);
      const sp = 95 * dt;
      if (d <= sp) {
        this.place(this.walkTo.x, this.walkTo.y);
        const then = this.walkTo.then; this.walkTo = null; this.play('idle');
        then?.();
      } else {
        this.place(this.x + dx / d * sp, this.y + dy / d * sp);
        this.face(dx >= 0 ? 1 : -1); this.play('walk', 0.85);
      }
      return;
    }
    const near = Math.hypot(px - this.x, (py - this.y) * 1.5) < 150;
    if (talking || (near && this.spot.behavior !== 'work')) {
      this.face(px >= this.x ? 1 : -1);
      if (this.spot.behavior !== 'phone' || talking) this.play('idle');
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    const b = this.spot.behavior;
    const r = Math.random();
    if (b === 'work') {
      if (r < 0.45) { this.play('interact'); this.timer = 2 + Math.random() * 2; }
      else if (r < 0.75 && this.spot.wander) { this.walkTo = { x: Phaser.Math.Between(this.spot.wander[0], this.spot.wander[1]), y: this.spot.y }; }
      else { this.play('idle'); this.timer = 1.5 + Math.random() * 2; }
    } else if (b === 'phone') {
      this.play(r < 0.8 ? 'phone' : 'idle'); this.timer = 3 + Math.random() * 3;
    } else if (b === 'pace' && this.spot.wander) {
      this.walkTo = { x: Phaser.Math.Between(this.spot.wander[0], this.spot.wander[1]), y: this.spot.y };
    } else {
      this.play('idle');
      if (r < 0.3) this.face(this.facing === 1 ? -1 : 1);
      this.timer = 2 + Math.random() * 3;
    }
  }
}

class Pedestrian extends Actor {
  constructor(scene: WorldScene, key: string, x: number, y: number, public lane: number, public speed: number, public chat = false) {
    super(scene, key, x, y);
  }
}

export class WorldScene extends Phaser.Scene {
  area!: AreaId;
  mode: Mode = 'play';
  layout!: AreaLayout;
  feet?: Phaser.GameObjects.Zone;
  player?: Actor;
  npcs = new Map<string, Npc>();
  peds: Pedestrian[] = [];
  extraPed?: Pedestrian;
  layers: Layer[] = [];
  skyA?: Phaser.GameObjects.Image;
  skyB?: Phaser.GameObjects.Image;
  panoDusk?: Phaser.GameObjects.Image;
  moon?: Phaser.GameObjects.Image;
  overlay!: Phaser.GameObjects.Image;
  glows: Array<{ img: Phaser.GameObjects.Image; base: number }> = [];
  ring!: Phaser.GameObjects.Image;
  marker!: Phaser.GameObjects.Image;
  arrow!: Phaser.GameObjects.Image;
  /** Alvo para onde a seta de objetivo aponta (tocar na seta leva até ele). */
  arrowTarget: TargetId | null = null;
  dyn: Record<string, Phaser.GameObjects.GameObject & { setVisible(v: boolean): unknown }> = {};
  viatura?: { img: Phaser.GameObjects.Image; zone: Phaser.GameObjects.Zone; lights: Phaser.GameObjects.Image[]; baseX: number };
  rain?: Phaser.GameObjects.Particles.ParticleEmitter;
  view = { x: 0, y: 0, w: 800, h: 600 };
  cam = { x: 0, y: 0, ready: false };
  target: InteractDef | null = null;
  targetKey = '';
  auto: { x: number; y: number; target?: TargetId; stuck: number; lx: number; ly: number; tries?: number; way?: Array<{ x: number; y: number }> } | null = null;
  cutscene = false;
  transitioning = false;
  timeOfDay: 'entardecer' | 'noite' = 'noite';
  lastSave = { x: 0, y: 0, t: 0 };
  fpsTimer = 0;
  attractT = 0;
  private cleanup: Array<() => void> = [];

  constructor() { super('World'); }

  init(data: WorldData) {
    this.area = data.area ?? 'vila';
    this.mode = data.mode ?? 'play';
    this.layout = AREAS[this.area];
    this.npcs = new Map(); this.peds = []; this.layers = []; this.glows = []; this.dyn = {};
    this.target = null; this.targetKey = ''; this.auto = null; this.cutscene = false; this.transitioning = false;
    this.cam.ready = false; this.viatura = undefined; this.extraPed = undefined; this.colliderGroup = undefined; this.panoDusk = undefined; this.rain = undefined; this.player = undefined; this.feet = undefined;
  }

  /** Escala por perspectiva: objetos mais próximos da câmera (y maior) ficam um pouco maiores. */
  perspective(y: number): number {
    const [y0, y1] = this.layout.depthRange, [s0, s1] = this.layout.scaleRange;
    const t = Phaser.Math.Clamp((y - y0) / (y1 - y0), 0, 1);
    return s0 + (s1 - s0) * t;
  }

  private state(): GameState | null { return ctx().store.get(); }
  private story(): StoryState { return this.state()?.story ?? defaultStory(); }
  private quality() { return ctx().settings().quality; }

  create() {
    const { bridge } = ctx();
    this.cameras.main.setBackgroundColor('#05090b');
    this.timeOfDay = this.mode === 'attract' ? 'noite' : this.story().clock.timeOfDay;
    if (this.area === 'vila') this.buildVila(); else if (this.area === 'bar') this.buildBar(); else this.buildCasa();
    this.buildColliders();
    this.overlay = this.add.image(0, 0, 'pixel').setOrigin(0, 0).setDepth(DEPTH.overlay).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.ring = this.add.image(0, 0, 'anel').setDepth(DEPTH.glow - 1).setVisible(false).setAlpha(0.9);
    this.marker = this.add.image(0, 0, 'marcador').setDepth(DEPTH.ui).setVisible(false);
    this.arrow = this.add.image(0, 0, 'seta').setDepth(DEPTH.ui).setVisible(false);
    if (!ctx().reducedMotion()) this.tweens.add({ targets: this.marker, y: '-=8', duration: 650, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (this.mode === 'play') this.spawnPlayer();
    this.refreshWorld(true);
    this.applyLighting(true);
    this.resize();
    this.scale.on('resize', this.resize, this);
    this.cleanup.push(() => this.scale.off('resize', this.resize, this));
    this.cleanup.push(ctx().store.subscribe((s, a) => { if (!a || a.type !== 'world/move') this.onStateChange(s); }));
    this.cleanup.push(bridge.on('interact', () => this.tryInteract()));
    this.input.on('pointerdown', this.onPointer, this);
    this.events.once('shutdown', () => { this.cleanup.forEach(f => f()); this.cleanup = []; this.input.off('pointerdown', this.onPointer, this); });
    const fadeMs = ctx().reducedMotion() ? 0 : 320;
    if (fadeMs) this.cameras.main.fadeIn(fadeMs, 5, 9, 11);
    bridge.emit('areaReady', { area: this.mode === 'attract' ? 'attract' : this.area });
    if (this.mode === 'play' && this.area === 'bar') this.maybeBarCutscene();
  }

  /* ------------------------------ Construção ------------------------------ */

  private layer(key: string, f: number, ox: number, oy: number, depth: number) {
    const img = this.add.image(ox, oy, key).setOrigin(0, 0).setDepth(depth);
    this.layers.push({ img, f, ox, oy });
    return img;
  }

  private addGlow(key: string, x: number, y: number, sx: number, sy: number, alpha: number, depth = DEPTH.glow) {
    const img = this.add.image(x, y, key).setScale(sx, sy).setBlendMode(Phaser.BlendModes.ADD).setDepth(depth).setAlpha(alpha);
    this.glows.push({ img, base: alpha });
    return img;
  }

  private buildVila() {
    const L = this.layout, q = this.quality(), rm = ctx().reducedMotion();
    this.skyA = this.add.image(0, 0, 'ceu_entardecer').setOrigin(0, 0).setDepth(DEPTH.sky);
    this.skyB = this.add.image(0, 0, 'ceu_noite').setOrigin(0, 0).setDepth(DEPTH.sky + 1);
    this.moon = this.add.image(0, 0, 'lua').setDepth(DEPTH.sky + 2);
    const painted = this.textures.exists('panorama_noite') && this.textures.exists('panorama_entardecer');
    if (painted) {
      // Panorama pintado (morro + prédios ao fundo), com versão de entardecer por cima para a transição.
      this.layer('panorama_noite', 0.15, -100, 0, DEPTH.far);
      this.panoDusk = this.layer('panorama_entardecer', 0.15, -100, 0, DEPTH.far + 1);
    } else {
      this.layer('morro', 0.15, -260, 70, DEPTH.far);
      this.layer('predios', 0.42, -160, 60, DEPTH.mid);
    }
    this.add.image(0, GROUND_Y, 'chao').setOrigin(0, 0).setDepth(DEPTH.ground);
    this.add.image(0, 0, 'fachadas').setOrigin(0, 0).setDepth(DEPTH.facade);
    this.add.image(0, 0, 'fios').setOrigin(0, 0).setDepth(DEPTH.wires);
    // Antena com luz vermelha piscando (acompanha o morro)
    const antenna = painted ? { x: PANORAMA.tower.x + 160, y: PANORAMA.tower.y - 70 } : artMeta.farLights.find(l => l.color === 'red');
    if (antenna) {
      const g = this.add.image(0, 0, 'glowRed').setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.far + 2).setScale(0.5);
      this.layers.push({ img: g, f: 0.15, ox: -260 + antenna.x, oy: 70 + antenna.y });
      g.setOrigin(0.5);
      if (!rm) this.tweens.add({ targets: g, alpha: 0.1, duration: 900, yoyo: true, repeat: -1, hold: 300 });
    }
    // Postes, cones de luz e poças de luz
    L.lamps.forEach((lamp, i) => {
      this.add.image(lamp.x, lamp.y, 'poste').setOrigin(0.5, 1).setDepth(lamp.y);
      this.colliderBox(lamp.x - 7, lamp.y - 10, 14, 10);
      const hx = lamp.x + 31, hy = lamp.y - 390 + 31;
      const head = this.addGlow('glow', hx, hy, 0.7, 0.7, 0.95);
      const cone = this.addGlow('cone', hx, hy + 2, 1, (lamp.y + 60 - hy) / 380, 0.32);
      cone.setOrigin(0.5, 0);
      const pool = this.addGlow('pool', hx, lamp.y + 40, 1.2, 1.4, 0.55);
      if (i === 3 && !rm) {
        const flick = () => {
          const off = Math.random() < 0.5;
          for (const o of [head, cone, pool]) o.setVisible(!off);
          this.time.delayedCall(off ? Phaser.Math.Between(60, 180) : Phaser.Math.Between(400, 4000), flick);
        };
        flick();
      }
    });
    // Janelas acesas
    artMeta.facadeLights.forEach(l => {
      const warm = l.color === 'warm';
      const g = this.addGlow('glowWarm', l.x + l.w / 2, l.y + l.h / 2, (l.w * (warm ? 1.4 : 2.2)) / 128, (l.h * (warm ? 1.2 : 2.2)) / 128, warm ? 0.32 : 0.42);
      if (!rm && q !== 'baixa' && Math.random() < 0.35) this.tweens.add({ targets: g, alpha: g.alpha * 0.45, duration: Phaser.Math.Between(1800, 4200), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 3000) });
      if (l.x > 712 && l.x < 1092 && l.y > 420) this.dyn['oficinaLuz'] = g;
    });
    // Luz que sai do bar para a calçada
    this.addGlow('glowWarm', 1768, 640, 2.2, 0.7, 0.5);
    this.addGlow('glowWarm', 2450, 640, 2.6, 0.6, 0.35);
    // Neon do bar
    const neon = this.add.image(artMeta.neon.x + 40, artMeta.neon.y + 6, 'neon_on').setDepth(DEPTH.facadeFx);
    const neonGlow = this.addGlow('glowRed', neon.x, neon.y, 2.4, 1.6, 0.4);
    if (!rm) {
      const flicker = () => {
        const off = Math.random() < 0.5;
        neon.setTexture(off ? 'neon_off' : 'neon_on'); neonGlow.setVisible(!off);
        this.time.delayedCall(off ? Phaser.Math.Between(40, 140) : Phaser.Math.Between(700, 5000), flicker);
      };
      flicker();
    }
    // Porta de aço da oficina (fechada após A1-M01)
    this.dyn['shutter'] = this.add.image(712, 430, 'oficina_fechada').setOrigin(0, 0).setDepth(DEPTH.facadeFx).setVisible(false);
    // Pichação no portão de casa (consequência de recusar o serviço de Miro em A1-M04)
    this.dyn['pichacao'] = this.add.image(400, 520, 'pichacao_deve').setDepth(DEPTH.facadeFx).setVisible(false);
    // Placa do ponto comercial quando o jogador possui um negócio
    this.dyn['placa'] = this.add.image(2160, 492, 'placa_bar').setDepth(DEPTH.facadeFx).setVisible(false);
    this.dyn['placaLuz'] = this.addGlow('glowWarm', 2160, 520, 1.8, 1, 0.45).setVisible(false);
    // Bandeirinhas (Festival de rua)
    this.dyn['bandeirinhas'] = this.add.image(1150, 330, 'bandeirinhas').setOrigin(0, 0).setDepth(DEPTH.wires + 1).setVisible(false);
    // Varal com roupas balançando
    ['roupa0', 'roupa1', 'roupa2', 'roupa3'].forEach((k, i) => {
      const x = 260 + i * 56, y = 214 + Math.sin((i + 0.5) / 4 * Math.PI) * 10;
      const c = this.add.image(x, y, k).setOrigin(0.5, 0).setDepth(DEPTH.facadeFx);
      if (!rm) this.tweens.add({ targets: c, angle: { from: -5, to: 6 }, duration: 1400 + i * 230, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });
    // Fumaça dos bueiros
    if (q !== 'baixa' && !rm) {
      for (const bx of [1590, 560]) {
        this.add.particles(bx, 770, 'fumaca', { speedY: { min: -28, max: -14 }, speedX: { min: -8, max: 10 }, scale: { start: 0.6, end: 2.2 }, alpha: { start: 0.35, end: 0 }, lifespan: 3200, frequency: q === 'alta' ? 260 : 480, quantity: 1 }).setDepth(770);
      }
    }
    // Mariposas nos postes (qualidade alta)
    if (q === 'alta' && !rm) {
      for (const lamp of L.lamps) {
        for (let k = 0; k < 3; k++) {
          const m = this.add.image(lamp.x + 31, lamp.y - 359, 'mariposa').setDepth(DEPTH.glow + 2).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: m, x: `+=${Phaser.Math.Between(-24, 24)}`, y: `+=${Phaser.Math.Between(-16, 18)}`, duration: Phaser.Math.Between(300, 700), yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        }
      }
    }
    // Objetos
    for (const p of L.props) {
      if (p.key === 'viatura') {
        const img = this.add.image(p.x, p.y, 'viatura').setOrigin(0.5, 1).setDepth(p.y).setVisible(false);
        const zone = this.colliderBox(p.collider!.x, p.collider!.y, p.collider!.w, p.collider!.h);
        const red = this.addGlow('glowRed', p.x - 10, p.y - 92, 1.2, 1.2, 0.8).setVisible(false);
        const blue = this.addGlow('glowBlue', p.x + 14, p.y - 92, 1.2, 1.2, 0.8).setVisible(false);
        if (!rm) this.tweens.add({ targets: [red], alpha: 0, duration: 260, yoyo: true, repeat: -1 });
        if (!rm) this.tweens.add({ targets: [blue], alpha: 0, duration: 260, yoyo: true, repeat: -1, delay: 260 });
        this.viatura = { img, zone, lights: [red, blue], baseX: p.x };
        continue;
      }
      this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setDepth(p.y).setFlipX(!!p.flip);
      if (p.collider) this.colliderBox(p.collider.x, p.collider.y, p.collider.w, p.collider.h);
    }
    // Primeiro plano desfocado (parallax > 1), só na borda de baixo
    const fg = this.add.graphics().setDepth(DEPTH.fg);
    fg.fillStyle(0x05090b, 0.92);
    for (let x = 0; x < 3400; x += 520) { fg.fillRect(x, 0, 30, 140); fg.fillRect(x - 60, 40, 150, 14); }
    fg.fillRect(0, 108, 3400, 60);
    this.layers.push({ img: fg as unknown as Phaser.GameObjects.Image, f: 1.12, ox: -200, oy: 950 });
    // Pedestres (rotinas simples, sem IA custosa)
    if (this.mode === 'play' || this.mode === 'attract') {
      // Moradores anônimos: usam as aparências pintadas que o jogador NÃO escolheu (com variação de tom);
      // sem arte pintada, caem nos bonecos procedurais.
      const chosen = this.state()?.profile.appearance ?? 0;
      const painted = [0, 1, 2].filter(a => a !== chosen).map(a => `char_player${a}`).filter(k => artMeta.sheetScale[k]);
      const TONES = [0xffffff, 0xffffff, 0xc9d3dc, 0xe2c9b0, 0xb8c6b8];
      const ped = (i: number, x: number, y: number, lane: number, speed: number, chat = false) => {
        const key = painted.length ? painted[i % painted.length]! : `char_ped${i % 3}`;
        const p = new Pedestrian(this, key, x, y, lane, speed, chat);
        if (painted.length && i >= painted.length) p.sprite.setTint(TONES[i % TONES.length]!);
        return p;
      };
      const chatA = ped(0, 1328, 712, 712, 0, true); chatA.face(1);
      const chatB = ped(1, 1392, 716, 716, 0, true); chatB.face(-1);
      chatA.balloon = this.add.image(1328, 590, 'balao').setDepth(DEPTH.ui - 1).setScale(0.8);
      this.peds.push(chatA, chatB);
      this.peds.push(ped(2, 200, 884, 884, 62));
      if (q !== 'baixa') this.peds.push(ped(3, 2500, 900, 900, -48));
      this.extraPed = ped(4, 2900, 860, 860, -70);
      this.peds.push(this.extraPed);
    }
    this.buildRain();
  }

  private buildCasa() {
    this.add.image(0, 0, 'casa_sala').setOrigin(0, 0).setDepth(DEPTH.ground);
    for (const l of this.layout.lamps) {
      this.addGlow('glowWarm', l.x, l.headY + 4, 1.6, 1.2, 0.8);
      this.addGlow('cone', l.x, l.headY + 2, 1.4, 1.1, 0.25).setOrigin(0.5, 0);
      this.addGlow('pool', l.x, 560, 2.2, 2.6, 0.32);
    }
    const w = artMeta.casaWindow;
    if (w.w) this.addGlow('glowWarm', w.x + w.w / 2, w.y + w.h / 2, 2.2, 1.8, 0.25);
    for (const p of this.layout.props) {
      this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setDepth(p.y).setFlipX(!!p.flip);
      if (p.collider) this.colliderBox(p.collider.x, p.collider.y, p.collider.w, p.collider.h);
    }
  }

  private buildBar() {
    const rm = ctx().reducedMotion();
    this.add.image(0, 0, 'bar_sala').setOrigin(0, 0).setDepth(DEPTH.ground);
    for (const l of artMeta.barLights) {
      this.addGlow('glowWarm', l.x, l.y, 1.4, 1.4, 0.75);
      this.addGlow('cone', l.x, l.y + 4, 1.1, 0.95, 0.22).setOrigin(0.5, 0);
      this.addGlow('pool', l.x, 600, 1.6, 2.2, 0.35);
    }
    // TV piscando
    const tv = artMeta.tv;
    const screen = this.add.image(tv.x, tv.y, 'pixel').setOrigin(0, 0).setDisplaySize(tv.w, tv.h).setDepth(DEPTH.ground + 1).setTint(0x4a7a9a);
    const tvGlow = this.addGlow('glowCool', tv.x + tv.w / 2, tv.y + tv.h / 2 + 40, 2.6, 2.4, 0.4);
    const tvTick = () => {
      const c = Phaser.Display.Color.HSVToRGB(Math.random(), 0.35, 0.55 + Math.random() * 0.4) as Phaser.Types.Display.ColorObject;
      const col = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
      screen.setTint(col); tvGlow.setTint(col);
      if (!rm) this.time.delayedCall(Phaser.Math.Between(250, 1300), tvTick);
    };
    tvTick();
    const fan = this.add.sprite(640, 64, 'ventilador0').setDepth(DEPTH.ground + 2);
    if (!rm && this.anims.exists('ventilador')) fan.play('ventilador');
    for (const p of this.layout.props) {
      this.add.image(p.x, p.y, p.key).setOrigin(0.5, 1).setDepth(p.y).setFlipX(!!p.flip);
      if (p.collider) this.colliderBox(p.collider.x, p.collider.y, p.collider.w, p.collider.h);
    }
  }

  colliderGroup?: Phaser.Physics.Arcade.StaticGroup;
  private colliderBox(x: number, y: number, w: number, h: number) {
    if (!this.colliderGroup) this.colliderGroup = this.physics.add.staticGroup();
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(z, true);
    this.colliderGroup.add(z);
    return z;
  }
  private buildColliders() { for (const b of this.layout.colliders) this.colliderBox(b.x, b.y, b.w, b.h); }

  private buildRain() {
    const s = ctx().settings();
    if (!s.rain || s.quality === 'baixa' || ctx().reducedMotion() || this.area !== 'vila') return;
    this.rain = this.add.particles(0, 0, 'chuva', {
      x: { min: 0, max: 1600 }, y: -30, speedY: { min: 820, max: 980 }, speedX: -140, lifespan: 1100,
      quantity: s.quality === 'alta' ? 4 : 2, frequency: 16, alpha: { start: 0.7, end: 0.3 }, rotate: 8
    }).setDepth(DEPTH.rain);
  }

  private spawnPlayer() {
    const s = this.state();
    const w = s?.world;
    const fallback = this.area === 'bar' ? this.layout.spawns.door! : this.area === 'casa' ? this.layout.spawns.porta! : this.layout.spawns.start!;
    const spawn = w && w.area === this.area ? { x: w.x, y: w.y, facing: w.facing } : fallback;
    const L = this.layout.walk;
    const x = Phaser.Math.Clamp(spawn.x, L.left + 20, L.right - 20), y = Phaser.Math.Clamp(spawn.y, L.top + 8, L.bottom - 4);
    this.player = new Actor(this, `char_player${s?.profile.appearance ?? 0}`, x, y);
    this.player.face(spawn.facing);
    this.feet = this.add.zone(x, y - 7, 26, 14);
    this.physics.add.existing(this.feet);
    const body = this.feet.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    this.physics.world.setBounds(L.left, L.top - 14, L.right - L.left, L.bottom - L.top + 14);
    if (this.colliderGroup) this.physics.add.collider(this.feet, this.colliderGroup);
    this.player.sprite.on('animationupdate', (_a: unknown, frame: Phaser.Animations.AnimationFrame) => {
      const f = Number(frame.textureFrame);
      if (f === 5 || f === 9) ctx().bridge.emit('step', { surface: this.area === 'vila' ? 'rua' : 'piso' });
    });
    this.lastSave = { x, y, t: 0 };
  }

  /* --------------------------- Reação ao estado --------------------------- */

  private onStateChange(s: GameState | null) {
    if (!s || this.mode !== 'play') return;
    if (s.world.area !== this.area && !this.transitioning) {
      // Ex.: importação de save em outra área.
      this.scene.restart({ area: s.world.area, mode: 'play' });
      return;
    }
    if (s.story.clock.timeOfDay !== this.timeOfDay) { this.timeOfDay = s.story.clock.timeOfDay; this.applyLighting(false); }
    this.refreshWorld(false);
  }

  private refreshWorld(initial: boolean) {
    const st = this.story();
    const s = this.state();
    // NPCs presentes nesta área
    for (const [id, n] of Object.entries(st.npcs)) {
      const spot = this.layout.spots[n.spot];
      const want = n.present && !!spot && (this.mode === 'play' || id !== 'miro');
      const has = this.npcs.get(id);
      if (want && !has) {
        this.npcs.set(id, new Npc(this, id, `char_${id}`, spot!));
      } else if (!want && has && !has.leaving) {
        if (initial) { has.destroy(); this.npcs.delete(id); continue; }
        has.leaving = true;
        const exit = this.area === 'bar' ? { x: 1140, y: 470 } : this.area === 'casa' ? { x: 905, y: 470 } : { x: id === 'magrao' ? 1180 : 2950, y: has.y + 30 };
        has.walkTo = { ...exit, then: () => { has.destroy(); this.npcs.delete(id); } };
      } else if (want && has && has.spot !== spot) {
        has.spot = spot!;
        has.walkTo = { x: spot!.x, y: spot!.y };
      }
    }
    if (this.area === 'vila') {
      const closed = st.flags['oficina_closed'] === true;
      this.dyn['shutter']?.setVisible(closed);
      this.dyn['oficinaLuz']?.setVisible(!closed);
      const biz = s?.rpg.businesses ?? [];
      const last = biz[biz.length - 1];
      const placa = this.dyn['placa'] as Phaser.GameObjects.Image | undefined;
      if (placa) { placa.setVisible(!!last); if (last) placa.setTexture(`placa_${last}`); }
      this.dyn['placaLuz']?.setVisible(!!last);
      const ev = s?.rpg.eventIndex ?? 3;
      this.dyn['bandeirinhas']?.setVisible(ev === 2);
      if (this.extraPed) {
        const busy = ev === 0 || ev === 2 || ev === 5;
        this.extraPed.hidden = !busy;
        this.extraPed.sprite.setVisible(busy); this.extraPed.shadow.setVisible(busy);
      }
      const crisis = !!s && (stageIs(s, 'A1-M05', 'go_bar') || stageIs(s, 'A1-M05', 'meet_miro'));
      const patrol = !!s && (s.rpg.heat >= 60 || ev === 1 || crisis);
      this.dyn['pichacao']?.setVisible(st.flags['m04_result'] === 'recusou');
      if (this.viatura) {
        // Na crise de A1-M05 a viatura para em frente ao Bar do Nando.
        const vx = crisis ? 1990 : this.viatura.baseX;
        if (this.viatura.img.x !== vx) {
          const dx = vx - this.viatura.img.x;
          this.viatura.img.x = vx;
          for (const l of this.viatura.lights) l.x += dx;
          this.viatura.zone.x += dx;
          (this.viatura.zone.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
        }
        this.viatura.img.setVisible(patrol);
        for (const l of this.viatura.lights) l.setVisible(patrol);
        (this.viatura.zone.body as Phaser.Physics.Arcade.StaticBody).enable = patrol;
      }
    }
  }

  private applyLighting(instant: boolean) {
    const night = this.timeOfDay === 'noite';
    const color = this.area !== 'vila' ? OVERLAY.bar : night ? OVERLAY.noite : OVERLAY.entardecer;
    this.overlay.setTint(color);
    const k = this.area !== 'vila' ? 1 : night ? 1 : 0.55;
    for (const g of this.glows) g.img.setAlpha(g.base * k);
    if (this.skyA && this.skyB) {
      const target = night ? 1 : 0;
      if (instant || ctx().reducedMotion()) { this.skyB.setAlpha(target); this.panoDusk?.setAlpha(1 - target); }
      else {
        this.tweens.add({ targets: this.skyB, alpha: target, duration: 1600 });
        if (this.panoDusk) this.tweens.add({ targets: this.panoDusk, alpha: 1 - target, duration: 1600 });
      }
      this.moon?.setVisible(night);
    }
  }

  /* ------------------------------- Câmera ------------------------------- */

  resize() {
    const cam = this.cameras.main;
    const W = this.scale.gameSize.width, H = this.scale.gameSize.height;
    cam.setSize(W, H);
    const portrait = W < H;
    const targetH = this.area !== 'vila' ? (portrait ? 680 : 620) : (portrait ? 900 : 800);
    let zoom = H / targetH;
    zoom = Math.max(zoom, W / this.layout.width, H / this.layout.height);
    cam.setZoom(zoom);
    this.view.w = W / zoom; this.view.h = H / zoom;
    this.overlay?.setDisplaySize(this.view.w + 8, this.view.h + 8);
    this.cam.ready = false;
  }

  private updateCamera(dt: number) {
    const cam = this.cameras.main;
    let tx: number, ty: number;
    if (this.player && this.mode === 'play') { tx = this.player.x; ty = this.player.y - 90; }
    else { this.attractT += dt; tx = 1450 + Math.sin(this.attractT * 0.06) * 1150; ty = 600; }
    const hw = this.view.w / 2, hh = this.view.h / 2;
    tx = Phaser.Math.Clamp(tx, hw, this.layout.width - hw);
    ty = Phaser.Math.Clamp(ty, hh, this.layout.height - hh);
    if (!this.cam.ready) { this.cam.x = tx; this.cam.y = ty; this.cam.ready = true; }
    else {
      const k = 1 - Math.exp(-dt * (ctx().reducedMotion() ? 14 : 6)); // suavização independente do FPS
      this.cam.x += (tx - this.cam.x) * k; this.cam.y += (ty - this.cam.y) * k;
    }
    cam.centerOn(this.cam.x, this.cam.y);
    this.view.x = this.cam.x - hw; this.view.y = this.cam.y - hh;
    const v = this.view;
    for (const l of this.layers) l.img.setPosition(v.x * (1 - l.f) + l.ox, v.y * (1 - l.f) + l.oy);
    if (this.skyA && this.skyB) {
      for (const s of [this.skyA, this.skyB]) s.setPosition(v.x - 2, v.y - 2).setDisplaySize(v.w + 4, v.h + 4);
      this.moon?.setPosition(v.x + v.w * 0.78, v.y + 70);
    }
    this.overlay.setPosition(v.x - 4, v.y - 4);
    this.rain?.setPosition(v.x - 100, v.y);
  }

  /* -------------------------------- Laço -------------------------------- */

  override update(_t: number, deltaMs: number) {
    const dt = Math.min(0.25, deltaMs / 1000);
    const st = this.state();
    const talking = !!st?.story.activeDialogue;
    this.updatePlayer(dt, talking);
    const px = this.player?.x ?? -9999, py = this.player?.y ?? -9999;
    for (const n of this.npcs.values()) n.update(dt, px, py, talking && this.isTalkingTo(n.id));
    this.updatePeds(dt);
    this.separate();
    this.updateCamera(dt);
    if (this.mode === 'play') { this.updateTarget(); this.updateObjective(); this.autosavePosition(dt); }
    this.fpsTimer += dt;
    if (this.fpsTimer > 1) { this.fpsTimer = 0; ctx().bridge.emit('fps', Math.round(this.game.loop.actualFps)); }
  }

  private isTalkingTo(id: string) {
    const a = this.state()?.story.activeDialogue;
    if (!a) return false;
    return a.sceneId.includes(id === 'magrao' ? 'oficina' : id) || a.sceneId === `bark-${id}` || (id === 'miro' && a.sceneId === 'A1-M02-cobranca') || (id === 'lia' && a.sceneId === 'A1-M01-casa');
  }

  private updatePlayer(dt: number, talking: boolean) {
    if (!this.player || !this.feet) return;
    const body = this.feet.body as Phaser.Physics.Arcade.Body;
    let vx = 0, vy = 0;
    const locked = this.cutscene || this.transitioning || talking || input.blocked;
    if (!locked) {
      vx = input.moveX; vy = input.moveY;
      const mag = Math.hypot(vx, vy);
      if (mag > 0.12) { this.auto = null; if (mag > 1) { vx /= mag; vy /= mag; } }
      else if (this.auto) {
        const goal = this.auto.way?.[0] ?? this.auto;
        const dx = goal.x - this.player.x, dy = goal.y - this.player.y, d = Math.hypot(dx, dy);
        const tgt = this.auto.target ? this.findTarget(this.auto.target) : null;
        if (tgt && this.distTo(tgt) <= tgt.radius * 0.95) { const id = this.auto.target!; this.auto = null; this.perform(id); }
        else if (this.auto.way && this.auto.way.length > 1 && d < 10) { this.auto.way.shift(); this.auto.stuck = 0; }
        else if (d < 6) { this.auto = null; }
        else {
          vx = dx / d; vy = dy / d;
          const moved = Math.hypot(this.player.x - this.auto.lx, this.player.y - this.auto.ly);
          this.auto.stuck = moved < SPEED * dt * 0.25 ? this.auto.stuck + dt : 0;
          this.auto.lx = this.player.x; this.auto.ly = this.player.y;
          if (this.auto.stuck > 0.3) {
            // Bloqueado (ex.: pedestre no caminho): recalcula a rota uma vez, depois desiste.
            this.auto.tries = (this.auto.tries ?? 0) + 1;
            const way = this.auto.tries <= 2 ? this.route(this.auto.x, this.auto.y) : null;
            if (way) { this.auto.way = way; this.auto.stuck = 0; } else this.auto = null;
          }
        }
      } else { vx = 0; vy = 0; }
    }
    body.setVelocity(vx * SPEED, vy * SPEED * 0.78);
    const moving = Math.hypot(vx, vy) > 0.12;
    this.player.place(this.feet.x, this.feet.y + 7);
    if (moving) {
      this.player.play('walk', Phaser.Math.Clamp(Math.hypot(vx, vy), 0.55, 1));
      if (Math.abs(vx) > 0.05) this.player.face(vx > 0 ? 1 : -1);
    } else if (!this.player.anim.endsWith('_interact')) this.player.play('idle');
    void dt;
  }

  private updatePeds(dt: number) {
    const W = this.layout.width;
    for (const p of this.peds) {
      if (p.hidden) continue;
      if (p.chat) {
        if (Math.random() < dt * 0.25) p.play(Math.random() < 0.5 ? 'interact' : 'idle');
        if (p.balloon) p.balloon.setVisible(Math.sin(this.time.now / 900) > 0.2);
        continue;
      }
      // Para se o jogador estiver bem na frente (não atravessa ninguém)
      const ahead = this.player && Math.abs(this.player.y - p.y) < 22 && Math.sign(this.player.x - p.x) === Math.sign(p.speed) && Math.abs(this.player.x - p.x) < 46;
      if (ahead) { p.play('idle'); continue; }
      let x = p.x + p.speed * dt;
      if (x > W + 60) { p.speed = -Math.abs(p.speed); x = W + 60; }
      if (x < -60) { p.speed = Math.abs(p.speed); x = -60; }
      p.place(x, p.lane); p.face(p.speed > 0 ? 1 : -1); p.play('walk', Math.abs(p.speed) / 95);
    }
  }

  /** Separação simples entre o protagonista e personagens (sem física completa). */
  private separate() {
    if (!this.player || !this.feet) return;
    const body = this.feet.body as Phaser.Physics.Arcade.Body;
    const others: Actor[] = [...this.npcs.values(), ...this.peds.filter(p => !p.hidden)];
    for (const o of others) {
      const dx = this.feet.x - o.x, dy = (this.feet.y + 7 - o.y) * 1.8, d = Math.hypot(dx, dy), min = 24;
      if (d >= min) continue;
      // Direção para fora (se estiverem exatamente sobrepostos, sai para o lado em que está virado).
      const nx = d > 0.01 ? dx / d : this.player.facing, ny = d > 0.01 ? dy / d : 0;
      // Empurra só a POSIÇÃO (não usa body.reset, que zerava a velocidade e prendia o jogador).
      this.feet.x += nx * (min - d);
      this.feet.y += (ny * (min - d)) / 1.8;
      // Remove apenas a parte do movimento que vai na direção do NPC; para os lados e para longe segue livre.
      const vx = body.velocity.x, vy = body.velocity.y * 1.8;
      const dot = vx * nx + vy * ny;
      if (dot < 0) body.velocity.set(vx - dot * nx, (vy - dot * ny) / 1.8);
    }
  }

  /* ----------------------------- Interação ----------------------------- */

  private interactables(): InteractDef[] {
    const st = this.story();
    const out: InteractDef[] = [];
    for (const it of this.layout.interactables) {
      if (it.npc) {
        const n = this.npcs.get(it.npc);
        if (!n || n.leaving) continue;
        out.push({ ...it, x: n.x, y: n.y, markerY: n.y - 150 * this.perspective(n.y) });
      } else {
        if (it.id === 'oficina' && st.npcs.magrao.present && this.npcs.has('magrao')) continue;
        out.push(it);
      }
    }
    return out;
  }
  private findTarget(id: TargetId) { return this.interactables().find(i => i.id === id) ?? null; }
  private distTo(t: InteractDef) {
    if (!this.player) return Infinity;
    return Math.hypot(this.player.x - t.x, (this.player.y - t.y) * 1.4);
  }

  private updateTarget() {
    const s = this.state();
    if (!s || !this.player) return;
    let best: InteractDef | null = null, bd = Infinity;
    if (!this.cutscene && !this.transitioning) {
      for (const it of this.interactables()) { const d = this.distTo(it); if (d <= it.radius && d < bd) { bd = d; best = it; } }
    }
    const key = best ? `${best.id}:${interactionLabel(s, best.id, best.name)}` : '';
    if (key !== this.targetKey) {
      this.targetKey = key; this.target = best;
      ctx().bridge.emit('target', best ? { id: best.id, label: interactionLabel(s, best.id, best.name) } : null);
    }
    if (best && !s.story.activeDialogue) {
      this.ring.setVisible(true).setPosition(best.x, best.y + 2).setScale(best.npc ? 0.7 : 1.1, best.npc ? 0.8 : 1);
    } else this.ring.setVisible(false);
  }

  private updateObjective() {
    const s = this.state();
    if (!s) return;
    const obj = currentObjective(s.story);
    let id: TargetId | null = obj?.target as TargetId | null ?? null;
    if (obj && obj.area && obj.area !== this.area) id = (EXIT_TO[this.area]?.[obj.area] ?? null) as TargetId | null;
    const t = id ? this.findTarget(id) : null;
    this.arrowTarget = null;
    if (!t || s.story.activeDialogue) { this.marker.setVisible(false); this.arrow.setVisible(false); return; }
    const v = this.view, inset = 30;
    const onScreen = t.x > v.x && t.x < v.x + v.w && t.markerY > v.y && t.markerY < v.y + v.h;
    if (onScreen) {
      this.marker.setVisible(true).setX(t.x);
      if (!this.tweens.isTweening(this.marker)) this.marker.setY(t.markerY); else if (Math.abs(this.marker.y - t.markerY) > 12) this.marker.setY(t.markerY);
      this.arrow.setVisible(false);
    } else {
      this.marker.setVisible(false);
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      const ang = Math.atan2(t.y - 80 - cy, t.x - cx);
      const ax = Phaser.Math.Clamp(t.x, v.x + inset, v.x + v.w - inset), ay = Phaser.Math.Clamp(t.y - 80, v.y + inset + 60, v.y + v.h - inset - 80);
      this.arrow.setVisible(true).setPosition(ax, ay).setRotation(ang).setScale(1 / Math.max(0.6, this.cameras.main.zoom) * 0.9);
      this.arrowTarget = id;
    }
  }

  private onPointer(p: Phaser.Input.Pointer) { this.tapWorld(p.worldX, p.worldY); }

  /** Toque vindo do HTML (ex.: toque curto na zona do joystick), em px CSS da janela. */
  tapScreen(cssX: number, cssY: number) {
    const ds = this.scale.displayScale;
    const pt = this.cameras.main.getWorldPoint(cssX * ds.x, cssY * ds.y);
    this.tapWorld(pt.x, pt.y);
  }

  tapWorld(wx: number, wy: number) {
    if (this.mode !== 'play' || !this.player || input.blocked || this.cutscene || this.transitioning || this.state()?.story.activeDialogue) return;
    let hit: InteractDef | null = null, bd = Infinity;
    // Tocar na seta do objetivo (alvo fora da tela) leva até ele — no celular a tela é estreita.
    const reach = 46 / Math.max(0.6, this.cameras.main.zoom);
    if (this.arrow.visible && this.arrowTarget && Math.hypot(wx - this.arrow.x, wy - this.arrow.y) < reach) hit = this.findTarget(this.arrowTarget);
    if (!hit) for (const it of this.interactables()) {
      const inBox = it.npc ? (Math.abs(wx - it.x) < 34 && wy < it.y + 8 && wy > it.y - 140) : Math.hypot(wx - it.x, wy - (it.y - 50)) < 80;
      if (inBox) { const d = Math.hypot(wx - it.x, wy - it.y); if (d < bd) { bd = d; hit = it; } }
    }
    const L = this.layout.walk;
    if (hit) {
      if (this.distTo(hit) <= hit.radius) { this.perform(hit.id); return; }
      this.walkTo(hit.x + (this.player.x < hit.x ? -30 : 30), Phaser.Math.Clamp(hit.y + 22, L.top + 6, L.bottom - 4), hit.id);
    } else if (wy > L.top - 30) {
      this.walkTo(Phaser.Math.Clamp(wx, L.left + 10, L.right - 10), Phaser.Math.Clamp(wy, L.top + 6, L.bottom - 4));
    }
  }

  /** Rota A* da posição atual até (x, y), evitando colisores (inclui a viatura quando visível). */
  private route(x: number, y: number) {
    if (!this.player) return null;
    // Pessoas paradas também bloqueiam a rota (o personagem contorna em vez de empurrar).
    const people = [...this.npcs.values(), ...this.peds.filter(p => !p.hidden && p.speed === 0)]
      .filter(a => Math.hypot(a.x - x, a.y - y) > 40)
      .map(a => ({ x: a.x - 14, y: a.y - 10, w: 28, h: 14 }));
    // A viatura entra como obstáculo na posição em que está desenhada (ela se move na crise de A1-M05).
    const v = this.viatura?.img.visible ? this.viatura : undefined;
    if (v) { const z = v.zone; people.push({ x: z.x - z.width / 2, y: z.y - z.height / 2, w: z.width, h: z.height }); }
    const boxes = obstacles(this.layout, people, false);
    return findPath(this.layout, { x: this.player.x, y: this.player.y }, { x, y }, boxes);
  }

  private walkTo(x: number, y: number, target?: TargetId) {
    if (!this.player) return;
    const way = this.route(x, y);
    if (!way || !way.length) { this.auto = null; return; }
    const end = way[way.length - 1]!;
    this.auto = { x: end.x, y: end.y, target, stuck: 0, lx: this.player.x, ly: this.player.y, way };
  }

  tryInteract() {
    if (this.mode !== 'play' || this.cutscene || this.transitioning || input.blocked) return;
    if (this.state()?.story.activeDialogue) return;
    if (this.target) this.perform(this.target.id);
  }

  perform(id: TargetId) {
    const { store, bridge } = ctx();
    const s = store.get();
    if (!s || !this.player) return;
    const t = this.findTarget(id);
    if (t) this.player.face(t.x >= this.player.x ? 1 : -1);
    const o = resolveInteraction(s, id);
    if (o.kind === 'door') { bridge.emit('sfx', 'door'); this.goTo(o.to, o.spawn); return; }
    this.player.play('interact');
    this.time.delayedCall(450, () => { if (this.player?.anim.endsWith('_interact')) this.player.play('idle'); });
    if (o.kind === 'panel') { bridge.emit('openPanel', o.tab); return; }
    if (o.kind === 'scene') {
      const n = t?.npc ? this.npcs.get(t.npc) : undefined;
      if (n) n.face(this.player.x >= n.x ? 1 : -1);
      bridge.emit('scene', o.sceneId);
      return;
    }
    bridge.emit('toast', { msg: o.msg });
  }

  goTo(to: AreaId, spawnKey: string) {
    if (this.transitioning || !this.player) return;
    this.transitioning = true;
    this.auto = null;
    const { store, bridge } = ctx();
    const target = AREAS[to];
    const spawn = target.spawns[spawnKey] ?? Object.values(target.spawns)[0]!;
    store.dispatch({ type: 'world/move', area: to, x: spawn.x, y: spawn.y, facing: spawn.facing });
    bridge.emit('transition', { to });
    const ms = ctx().reducedMotion() ? 0 : 300;
    if (!ms) { this.scene.restart({ area: to, mode: 'play' }); return; }
    this.cameras.main.fadeOut(ms, 5, 9, 11);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ area: to, mode: 'play' }));
  }

  /** A1-M02: Miro levanta da mesa do fundo e puxa uma cadeira na frente do protagonista. */
  private maybeBarCutscene() {
    const s = this.state();
    if (!s) return;
    const sceneId = barAutoScene(s);
    if (!sceneId) return;
    if (s.story.activeDialogue) return; // diálogo será retomado pela interface
    const miro = this.npcs.get('miro');
    if (sceneId !== 'A1-M02-cobranca' || !miro || !this.player) {
      this.cutscene = true;
      this.time.delayedCall(ctx().reducedMotion() ? 0 : 900, () => { this.cutscene = false; ctx().bridge.emit('scene', sceneId); });
      return;
    }
    this.cutscene = true;
    const tx = this.player.x - 90, ty = Phaser.Math.Clamp(this.player.y + 6, this.layout.walk.top + 6, this.layout.walk.bottom - 6);
    const go = () => { miro.face(1); this.player?.face(-1); this.cutscene = false; ctx().bridge.emit('scene', sceneId); };
    if (ctx().reducedMotion()) { miro.place(tx, ty); go(); return; }
    this.time.delayedCall(700, () => { miro.walkTo = { x: tx, y: ty, then: () => this.time.delayedCall(250, go) }; });
  }

  private autosavePosition(dt: number) {
    if (!this.player || this.transitioning) return;
    this.lastSave.t += dt;
    if (this.lastSave.t < 4) return;
    this.lastSave.t = 0;
    if (Math.hypot(this.player.x - this.lastSave.x, this.player.y - this.lastSave.y) < 4) return;
    this.savePosition();
  }

  savePosition() {
    if (!this.player || this.mode !== 'play') return;
    this.lastSave.x = this.player.x; this.lastSave.y = this.player.y;
    ctx().store.dispatch({ type: 'world/move', area: this.area, x: this.player.x, y: this.player.y, facing: this.player.facing });
  }
}
