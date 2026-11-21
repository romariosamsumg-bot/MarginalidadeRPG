/**
 * Layout das áreas exploráveis (coordenadas de mundo, em pixels lógicos).
 * Plano dos pés: personagens e objetos são ordenados por Y (Y-sorting) e colidem
 * apenas pela "pegada" no chão — o que dá a profundidade 2.5D.
 */
import type { TargetId } from '../narrative/triggers';
import type { NpcId } from '../narrative/types';

export interface Box { x: number; y: number; w: number; h: number }
export interface PropDef { key: string; x: number; y: number; collider?: Box; flip?: boolean; when?: 'festival' | 'patrol' | 'always' }
export interface InteractDef { id: TargetId; x: number; y: number; radius: number; name: string; markerY: number; npc?: NpcId }
export interface NpcSpot { x: number; y: number; wander?: [number, number]; behavior: 'idle' | 'pace' | 'phone' | 'work' | 'watch'; facing?: 1 | -1 }
export interface AreaLayout {
  id: 'vila' | 'bar' | 'casa';
  width: number; height: number;
  walk: { left: number; right: number; top: number; bottom: number };
  colliders: Box[];
  props: PropDef[];
  interactables: InteractDef[];
  spots: Record<string, NpcSpot>;
  spawns: Record<string, { x: number; y: number; facing: 1 | -1 }>;
  lamps: Array<{ x: number; y: number; headY: number }>;
  /** Faixa vertical usada para a escala de perspectiva (y do fundo → y da frente). */
  depthRange: [number, number];
  scaleRange: [number, number];
}

/** Retângulo de colisão centrado na base (x, y) de um objeto. */
const foot = (x: number, y: number, w: number, h: number): Box => ({ x: x - w / 2, y: y - h, w, h });

export const VILA: AreaLayout = {
  id: 'vila',
  width: 2900, height: 960,
  walk: { left: 36, right: 2864, top: 596, bottom: 928 },
  colliders: [
    { x: 0, y: 0, w: 2900, h: 596 },          // fachadas (não se atravessa parede)
    { x: 0, y: 0, w: 36, h: 960 },            // muro à esquerda
    { x: 2864, y: 0, w: 36, h: 960 }          // barreira da avenida
  ],
  props: [
    { key: 'lixeira', x: 640, y: 612, collider: foot(640, 612, 34, 14) },
    { key: 'moto', x: 820, y: 650, collider: foot(820, 650, 96, 16) },
    { key: 'pneus', x: 1110, y: 618, collider: foot(1110, 618, 46, 14) },
    { key: 'mural', x: 1272, y: 606, collider: foot(1272, 606, 88, 10) },
    { key: 'banco', x: 1360, y: 626, collider: foot(1360, 626, 96, 14) },
    { key: 'arvore', x: 1470, y: 640, collider: foot(1470, 640, 30, 14) },
    { key: 'mesa', x: 1640, y: 662, collider: foot(1640, 662, 84, 16) },
    { key: 'mesa', x: 1890, y: 668, collider: foot(1890, 668, 84, 16), flip: true },
    { key: 'engradados', x: 2010, y: 616, collider: foot(2010, 616, 44, 14) },
    { key: 'caixotes', x: 2340, y: 620, collider: foot(2340, 620, 78, 14) },
    { key: 'abrigo', x: 2740, y: 672, collider: foot(2740, 672, 150, 14) },
    { key: 'carro', x: 1215, y: 812, collider: foot(1215, 812, 220, 28) },
    { key: 'viatura', x: 2330, y: 860, collider: foot(2330, 860, 220, 28), when: 'patrol' }
  ],
  interactables: [
    { id: 'casa', x: 400, y: 606, radius: 82, name: 'Casa', markerY: 455 },
    { id: 'lia', x: 0, y: 0, radius: 74, name: 'Lia', markerY: 0, npc: 'lia' },
    { id: 'magrao', x: 0, y: 0, radius: 80, name: 'Magrão', markerY: 0, npc: 'magrao' },
    { id: 'oficina', x: 905, y: 606, radius: 90, name: 'Oficina 24', markerY: 470 },
    { id: 'mural', x: 1272, y: 618, radius: 80, name: 'Mural da Passarela', markerY: 480 },
    { id: 'bar_porta', x: 1768, y: 606, radius: 80, name: 'Bar do Nando', markerY: 455 },
    { id: 'miro', x: 0, y: 0, radius: 76, name: 'Miro', markerY: 0, npc: 'miro' },
    { id: 'loja', x: 2150, y: 606, radius: 76, name: 'Ponto comercial', markerY: 470 },
    { id: 'solange', x: 0, y: 0, radius: 76, name: 'Dona Solange', markerY: 0, npc: 'solange' },
    { id: 'mercearia', x: 2400, y: 606, radius: 80, name: 'Mercearia da Solange', markerY: 470 },
    { id: 'ponto', x: 2740, y: 690, radius: 92, name: 'Ponto de ônibus', markerY: 520 }
  ],
  spots: {
    oficina: { x: 930, y: 628, wander: [870, 1010], behavior: 'work', facing: -1 },
    casa: { x: 492, y: 614, behavior: 'idle', facing: -1 },
    casa_noite: { x: 486, y: 612, behavior: 'phone', facing: -1 },
    mercearia: { x: 2500, y: 618, wander: [2450, 2580], behavior: 'work', facing: -1 },
    esquina: { x: 2066, y: 664, behavior: 'watch', facing: -1 },
    passarela: { x: 1236, y: 662, behavior: 'phone', facing: 1 }
  },
  spawns: {
    start: { x: 470, y: 660, facing: 1 },
    bar_porta: { x: 1768, y: 640, facing: 1 },
    casa_porta: { x: 400, y: 646, facing: 1 }
  },
  lamps: [
    { x: 300, y: 690, headY: 318 }, { x: 1010, y: 690, headY: 318 }, { x: 1560, y: 690, headY: 318 },
    { x: 2050, y: 690, headY: 318 }, { x: 2600, y: 690, headY: 318 }
  ],
  depthRange: [596, 928],
  scaleRange: [0.92, 1.06]
};

export const BAR: AreaLayout = {
  id: 'bar',
  width: 1280, height: 760,
  walk: { left: 70, right: 1210, top: 452, bottom: 724 },
  colliders: [
    { x: 0, y: 0, w: 1280, h: 452 },
    { x: 100, y: 440, w: 540, h: 66 },        // balcão
    { x: 0, y: 0, w: 70, h: 760 },
    { x: 1210, y: 0, w: 70, h: 760 }
  ],
  props: [
    { key: 'balcao', x: 370, y: 512 },
    { key: 'mesa_bar', x: 760, y: 596, collider: foot(760, 596, 120, 20) },
    { key: 'mesa_bar', x: 1010, y: 560, collider: foot(1010, 560, 120, 20), flip: true },
    { key: 'mesa_bar', x: 880, y: 712, collider: foot(880, 712, 120, 20) },
    { key: 'jukebox', x: 1160, y: 480, collider: foot(1160, 480, 60, 18) },
    { key: 'banquetas', x: 370, y: 540, collider: foot(370, 540, 300, 10) }
  ],
  interactables: [
    { id: 'nando', x: 0, y: 0, radius: 175, name: 'Nando', markerY: 0, npc: 'nando' },
    { id: 'ze', x: 0, y: 0, radius: 76, name: 'Seu Zé', markerY: 0, npc: 'ze' },
    { id: 'miro', x: 0, y: 0, radius: 90, name: 'Miro', markerY: 0, npc: 'miro' },
    { id: 'tv', x: 1000, y: 470, radius: 70, name: 'Televisão', markerY: 300 },
    { id: 'bar_saida', x: 1130, y: 470, radius: 80, name: 'Saída', markerY: 300 }
  ],
  spots: {
    balcao: { x: 380, y: 448, wander: [190, 590], behavior: 'work', facing: 1 },
    bar_canto: { x: 640, y: 690, behavior: 'idle', facing: 1 },
    bar_mesa: { x: 1010, y: 520, behavior: 'watch', facing: -1 }
  },
  spawns: {
    door: { x: 1120, y: 492, facing: -1 }
  },
  lamps: [{ x: 300, y: 440, headY: 120 }, { x: 760, y: 440, headY: 120 }, { x: 1030, y: 440, headY: 120 }],
  depthRange: [452, 724],
  scaleRange: [1.0, 1.12]
};

/** Interior da casa de Lia (onde o protagonista mora). */
export const CASA: AreaLayout = {
  id: 'casa',
  width: 1000, height: 680,
  walk: { left: 60, right: 940, top: 438, bottom: 650 },
  colliders: [
    { x: 0, y: 0, w: 1000, h: 438 },
    { x: 0, y: 0, w: 60, h: 680 },
    { x: 940, y: 0, w: 60, h: 680 }
  ],
  props: [
    { key: 'geladeira', x: 160, y: 460, collider: foot(160, 460, 90, 20) },
    { key: 'mesa_cozinha', x: 420, y: 556, collider: foot(420, 556, 190, 22) },
    { key: 'sofa', x: 770, y: 498, collider: foot(770, 498, 220, 26) }
  ],
  interactables: [
    { id: 'lia', x: 0, y: 0, radius: 90, name: 'Lia', markerY: 0, npc: 'lia' },
    { id: 'sofa', x: 770, y: 520, radius: 110, name: 'Sofá', markerY: 360 },
    { id: 'saida_casa', x: 905, y: 452, radius: 80, name: 'Porta', markerY: 250 }
  ],
  spots: {
    casa_mesa: { x: 300, y: 560, behavior: 'phone', facing: 1 }
  },
  spawns: {
    porta: { x: 870, y: 500, facing: -1 }
  },
  lamps: [{ x: 440, y: 438, headY: 96 }],
  depthRange: [438, 650],
  scaleRange: [1.0, 1.1]
};

export const AREAS = { vila: VILA, bar: BAR, casa: CASA } as const;

/** Portas: alvo de interação → área de destino e ponto de chegada. */
export const DOORS: Record<string, { to: 'vila' | 'bar' | 'casa'; spawn: string }> = {
  bar_porta: { to: 'bar', spawn: 'door' },
  bar_saida: { to: 'vila', spawn: 'bar_porta' },
  casa: { to: 'casa', spawn: 'porta' },
  saida_casa: { to: 'vila', spawn: 'casa_porta' }
};

/** Para onde a seta de objetivo aponta quando o alvo está em outra área. */
export const EXIT_TO: Record<string, Record<string, string>> = {
  vila: { bar: 'bar_porta', casa: 'casa' },
  bar: { vila: 'bar_saida', casa: 'bar_saida' },
  casa: { vila: 'saida_casa', bar: 'saida_casa' }
};
