/**
 * Personagens pintados proceduralmente (vista lateral 3/4, voltados para a direita).
 * Cada folha contém: ociosidade (4), caminhada (8), interação (3), celular (2) = 17 quadros.
 * Retratos 256×256 para o diálogo são pintados com o mesmo boneco em escala maior.
 */
import { INK, PAL, halftone, makeCanvas, shade } from './paint';

export type HairStyle = 'short' | 'buzz' | 'curly' | 'ponytail' | 'bun' | 'long' | 'bald' | 'braids';
export type TopStyle = 'tshirt' | 'jacket' | 'apron' | 'hoodie' | 'tank' | 'shirt' | 'overall' | 'cardigan';
export interface CharSpec {
  id: string;
  skin: string;
  hair: string; hairStyle: HairStyle;
  top: string; topStyle: TopStyle; inner?: string; apron?: string;
  bottom: string; shoes: string;
  cap?: string; towel?: boolean; chain?: boolean; bag?: string; glasses?: boolean; mustache?: boolean; stubble?: boolean; earring?: boolean;
  height?: number; build?: number;
  portraitBg: string;
}

export const FRAME_W = 80;
export const FRAME_H = 132;
export const FRAMES = { idle: [0, 1, 2, 3], walk: [4, 5, 6, 7, 8, 9, 10, 11], interact: [12, 13, 14], phone: [15, 16] } as const;
export const FRAME_COUNT = 17;

/** Elenco. Paleta: azul-petróleo, preto, âmbar e toques de vermelho. Sem roupas de marca. */
export const PLAYER_LOOKS: CharSpec[] = [
  { id: 'player0', skin: '#8d5a3b', hair: '#15100d', hairStyle: 'short', top: '#2a6672', topStyle: 'hoodie', bottom: '#20262b', shoes: '#d9d2c2', bag: '#3b2a20', portraitBg: '#123640' },
  { id: 'player1', skin: '#5b3825', hair: '#0f0b09', hairStyle: 'braids', top: '#8e1f27', topStyle: 'jacket', inner: '#e9e4d6', bottom: '#1b2226', shoes: '#16191b', earring: true, portraitBg: '#3a1418' },
  { id: 'player2', skin: '#c99772', hair: '#3a2518', hairStyle: 'curly', top: '#3e4a3f', topStyle: 'tshirt', bottom: '#2b3a4a', shoes: '#8e1f27', chain: true, portraitBg: '#1f2d26' }
];

export const NPC_LOOKS: Record<string, CharSpec> = {
  magrao: { id: 'magrao', skin: '#6e432b', hair: '#111', hairStyle: 'buzz', top: '#2f4f6b', topStyle: 'overall', inner: '#c7c0ad', bottom: '#2f4f6b', shoes: '#141414', cap: '#c8323c', towel: false, height: 1.04, build: 0.92, portraitBg: '#1b3a4f' },
  lia: { id: 'lia', skin: '#7a4a30', hair: '#120c09', hairStyle: 'ponytail', top: '#d9cfb8', topStyle: 'cardigan', inner: '#2a6672', bottom: '#263340', shoes: '#e9e4d6', bag: '#6e3a2a', height: 0.95, build: 0.9, portraitBg: '#2a4a40' },
  solange: { id: 'solange', skin: '#4f3022', hair: '#b9b3a8', hairStyle: 'bun', top: '#7a2f3a', topStyle: 'shirt', apron: '#e2d9c3', bottom: '#2c2a2a', shoes: '#3a2a20', glasses: true, height: 0.92, build: 1.12, portraitBg: '#4a2a22' },
  miro: { id: 'miro', skin: '#a8735a', hair: '#1a1410', hairStyle: 'short', top: '#161a1d', topStyle: 'jacket', inner: '#7c1f26', bottom: '#14181b', shoes: '#0d0d0d', chain: true, stubble: true, height: 1.06, build: 1.08, portraitBg: '#2b0f12' },
  nando: { id: 'nando', skin: '#b07c5c', hair: '#2a211b', hairStyle: 'bald', top: '#e9e4d6', topStyle: 'tshirt', apron: '#1b4b56', bottom: '#2c3338', shoes: '#141414', towel: true, mustache: true, build: 1.15, portraitBg: '#3b3020' },
  ze: { id: 'ze', skin: '#5d3a27', hair: '#d8d2c6', hairStyle: 'short', top: '#7d6a45', topStyle: 'shirt', bottom: '#3a3a36', shoes: '#2a1f18', glasses: false, mustache: true, height: 0.94, portraitBg: '#2e2a1c' },
  // Ato II — pintadas por código (sem arte gerada; créditos esgotados). Ver docs/RECURSOS_A_SUBSTITUIR.md.
  vania: { id: 'vania', skin: '#9a6648', hair: '#1c1714', hairStyle: 'bun', top: '#5c6166', topStyle: 'jacket', inner: '#d9d2c2', bottom: '#2a2d31', shoes: '#141414', earring: true, height: 1.0, build: 0.92, portraitBg: '#2c3236' },
  helena: { id: 'helena', skin: '#c08a68', hair: '#3a2a20', hairStyle: 'ponytail', top: '#1f2a33', topStyle: 'jacket', inner: '#7d8a91', bottom: '#22272b', shoes: '#111', glasses: true, height: 0.98, build: 0.95, portraitBg: '#1b2a36' },
  ped0: { id: 'ped0', skin: '#8a5a3c', hair: '#0e0b08', hairStyle: 'curly', top: '#1b4b56', topStyle: 'tshirt', bottom: '#3b3b3b', shoes: '#ddd', bag: '#1a1a1a', portraitBg: '#123640' },
  ped1: { id: 'ped1', skin: '#c49a78', hair: '#2a1a10', hairStyle: 'long', top: '#a8634a', topStyle: 'tank', bottom: '#1d2a36', shoes: '#111', portraitBg: '#123640' },
  ped2: { id: 'ped2', skin: '#3f281c', hair: '#0b0b0b', hairStyle: 'buzz', top: '#3a3f44', topStyle: 'shirt', bottom: '#5a4a38', shoes: '#151515', cap: '#1b4b56', portraitBg: '#123640' }
};

interface Pose { bob: number; lean: number; nearThigh: number; nearKnee: number; farThigh: number; farKnee: number; nearArm: number; nearElbow: number; farArm: number; farElbow: number; headTilt: number; phone: boolean; sway: number }

const D = Math.PI / 180;

function poseFor(frame: number): Pose {
  const base: Pose = { bob: 0, lean: 0, nearThigh: 2, nearKnee: 4, farThigh: -2, farKnee: 4, nearArm: 4, nearElbow: 10, farArm: -4, farElbow: 10, headTilt: 0, phone: false, sway: 0 };
  if (frame <= 3) {
    const b = [0, -0.5, -1, -0.5][frame]!;
    return { ...base, bob: b, nearArm: 3 + b, farArm: -3 - b, sway: [0, 0.5, 1, 0.5][frame]! };
  }
  if (frame <= 11) {
    const p = (frame - 4) / 8, w = Math.sin(p * Math.PI * 2), c = Math.cos(p * Math.PI * 2);
    return {
      ...base,
      bob: -Math.abs(Math.sin(p * Math.PI * 2)) * 2.2 + 1,
      lean: 2.5,
      nearThigh: 27 * w, nearKnee: 8 + Math.max(0, -c) * 38 + Math.max(0, w) * 6,
      farThigh: -27 * w, farKnee: 8 + Math.max(0, c) * 38 + Math.max(0, -w) * 6,
      nearArm: -24 * w, nearElbow: 18 + Math.max(0, -w) * 18,
      farArm: 24 * w, farElbow: 18 + Math.max(0, w) * 18,
      sway: w * 3
    };
  }
  if (frame <= 14) {
    const k = frame - 12;
    return { ...base, lean: 3 + k, nearArm: [55, 78, 70][k]!, nearElbow: [25, 8, 14][k]!, farArm: -6, headTilt: 2 };
  }
  const k = frame - 15;
  return { ...base, phone: true, nearArm: 18, nearElbow: 112 + k * 4, farArm: -4, headTilt: 5 + k };
}

function limb(g: CanvasRenderingContext2D, pts: number[], w: number, color: string, outline = 2.4) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(pts[0]!, pts[1]!); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.strokeStyle = INK; g.lineWidth = w + outline * 2; g.stroke();
  g.beginPath(); g.moveTo(pts[0]!, pts[1]!); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.strokeStyle = color; g.lineWidth = w; g.stroke();
}

function blob(g: CanvasRenderingContext2D, draw: () => void, fill: string, lw = 2.2) {
  g.beginPath(); draw();
  g.fillStyle = fill; g.fill();
  g.lineWidth = lw; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
}

/** Desenha um personagem em coordenadas lógicas (80×132, pés em y=128). */
export function drawFigure(g: CanvasRenderingContext2D, spec: CharSpec, frame: number) {
  const P = poseFor(frame);
  const H = spec.height ?? 1, W = spec.build ?? 1;
  const ground = 128;
  const thigh = 23 * H, shin = 24 * H;
  const hipX = 40, hipY = ground - thigh - shin - 4 + P.bob;
  const torso = 33 * H;
  const shX = hipX + P.lean, shY = hipY - torso;
  const headR = 10.5;
  const headX = shX + 1.5 + P.headTilt * 0.25, headY = shY - 4 - headR + P.headTilt * 0.25;
  const skinShade = shade(spec.skin, 0.7);
  const isApron = !!spec.apron;
  const sleeve = spec.topStyle === 'tank' ? spec.skin : spec.topStyle === 'overall' ? (spec.inner ?? spec.top) : spec.top;

  const legPts = (thighA: number, knee: number, side: number) => {
    const hx = hipX + side, hy = hipY + 2;
    const a = thighA * D, k = knee * D;
    const kx = hx + Math.sin(a) * thigh, ky = hy + Math.cos(a) * thigh;
    const ax = kx + Math.sin(a - k) * shin, ay = ky + Math.cos(a - k) * shin;
    return { hx, hy, kx, ky, ax, ay };
  };
  const drawLeg = (thighA: number, knee: number, side: number, dark: boolean) => {
    const L = legPts(thighA, knee, side);
    const pc = dark ? shade(spec.bottom, 0.68) : spec.bottom;
    limb(g, [L.hx, L.hy, L.kx, L.ky, L.ax, L.ay], 11.5 * W, pc);
    // Tênis/sapato
    const sc = dark ? shade(spec.shoes, 0.7) : spec.shoes;
    blob(g, () => { g.ellipse(L.ax + 3.5, Math.min(ground - 1.5, L.ay + 1.5), 6.5, 3.4, 0, 0, Math.PI * 2); }, sc, 2);
  };
  const armPts = (ang: number, elbow: number, side: number) => {
    const sx = shX + side, sy = shY + 4;
    const a = ang * D, e = elbow * D;
    const ex = sx + Math.sin(a) * 15 * H, ey = sy + Math.cos(a) * 15 * H;
    const wx = ex + Math.sin(a + e) * 14 * H, wy = ey + Math.cos(a + e) * 14 * H;
    return { sx, sy, ex, ey, wx, wy };
  };
  const drawArm = (ang: number, elbow: number, side: number, dark: boolean) => {
    const A = armPts(ang, elbow, side);
    const sc = dark ? shade(sleeve, 0.66) : sleeve;
    const skin = dark ? skinShade : spec.skin;
    const shortSleeve = spec.topStyle === 'tshirt' || spec.topStyle === 'tank' || spec.topStyle === 'overall';
    if (shortSleeve) {
      const mx = A.sx + (A.ex - A.sx) * 0.55, my = A.sy + (A.ey - A.sy) * 0.55;
      limb(g, [A.sx, A.sy, A.ex, A.ey, A.wx, A.wy], 7.5 * W, skin);
      limb(g, [A.sx, A.sy, mx, my], 9.5 * W, sc);
    } else {
      limb(g, [A.sx, A.sy, A.ex, A.ey, A.wx, A.wy], 9 * W, sc);
    }
    blob(g, () => { g.arc(A.wx, A.wy, 3.3, 0, Math.PI * 2); }, skin, 1.8);
    return A;
  };

  // 1) Braço de trás e perna de trás (sombreados)
  drawArm(P.farArm, P.farElbow, -3, true);
  drawLeg(P.farThigh, P.farKnee, -2.5, true);
  // Bolsa de trás (alça cruzada)
  if (spec.bag) blob(g, () => { g.roundRect(hipX - 13 * W, hipY - 9, 9, 12, 2); }, shade(spec.bag, 0.85), 2);
  // 2) Perna da frente
  drawLeg(P.nearThigh, P.nearKnee, 2.5, false);
  // Quadril
  blob(g, () => { g.ellipse(hipX + 1, hipY + 1, 12.5 * W, 7, 0, 0, Math.PI * 2); }, spec.bottom, 2);

  // 3) Tronco
  const tw = 13.5 * W;
  const torsoPath = () => {
    g.moveTo(shX - tw, shY + 1);
    g.quadraticCurveTo(shX, shY - 3, shX + tw * 0.9, shY + 1);
    g.quadraticCurveTo(shX + tw * 1.08, shY + torso * 0.35, hipX + tw * 0.82, hipY + 3);
    g.lineTo(hipX - tw * 0.85, hipY + 3);
    g.quadraticCurveTo(shX - tw * 1.1, shY + torso * 0.4, shX - tw, shY + 1);
    g.closePath();
  };
  blob(g, torsoPath, spec.top, 2.4);
  // Sombra dura nas costas + retícula
  g.save(); g.beginPath(); torsoPath(); g.clip();
  g.fillStyle = 'rgba(5,12,16,0.42)';
  g.beginPath(); g.moveTo(shX - tw - 2, shY - 4); g.lineTo(shX - tw * 0.1, shY - 4); g.lineTo(hipX - tw * 0.35, hipY + 6); g.lineTo(hipX - tw - 4, hipY + 6); g.closePath(); g.fill();
  halftone(g, shX - tw - 4, shY - 4, tw * 1.4, torso + 10, 3.2, 0.75, '#000', 0.28);
  // Peças sobre o tronco
  if (spec.topStyle === 'jacket' || spec.topStyle === 'cardigan') {
    g.fillStyle = spec.inner ?? '#ddd';
    g.beginPath(); g.moveTo(shX + tw * 0.35, shY + 1); g.lineTo(shX + tw * 0.95, shY + 2); g.lineTo(hipX + tw * 0.78, hipY + 3); g.lineTo(hipX + tw * 0.28, hipY + 3); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.6; g.beginPath(); g.moveTo(shX + tw * 0.35, shY + 1); g.lineTo(hipX + tw * 0.28, hipY + 3); g.stroke();
  }
  if (spec.topStyle === 'overall') {
    g.fillStyle = spec.inner ?? '#ccc';
    g.fillRect(shX - tw, shY - 2, tw * 2.2, 8);
    g.strokeStyle = INK; g.lineWidth = 1.4; g.beginPath(); g.moveTo(shX - tw, shY + 6); g.lineTo(shX + tw, shY + 6); g.stroke();
    g.fillStyle = shade(spec.top, 0.8); g.fillRect(shX + 2, shY + 12, 6, 5);
  }
  if (spec.topStyle === 'hoodie') {
    g.strokeStyle = shade(spec.top, 0.6); g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(shX + 4, shY + 3); g.lineTo(shX + 5, shY + 14); g.moveTo(shX + 7, shY + 3); g.lineTo(shX + 8, shY + 12); g.stroke();
    g.fillStyle = shade(spec.top, 0.82); g.fillRect(hipX - 3, hipY - 12, tw * 1.3, 7);
  }
  if (isApron) {
    g.fillStyle = spec.apron!;
    g.beginPath(); g.moveTo(shX + 1, shY + 8); g.lineTo(shX + tw * 0.98, shY + 8); g.lineTo(hipX + tw * 0.95, hipY + 3); g.lineTo(hipX - 1, hipY + 3); g.closePath(); g.fill();
    g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke();
  }
  // Luz de recorte âmbar (poste) na frente do tronco
  g.strokeStyle = 'rgba(255,197,107,0.55)'; g.lineWidth = 1.6;
  g.beginPath(); g.moveTo(shX + tw * 0.9, shY + 3); g.quadraticCurveTo(shX + tw * 1.05, shY + torso * 0.35, hipX + tw * 0.8, hipY); g.stroke();
  g.restore();
  g.lineWidth = 2.4; g.strokeStyle = INK; g.beginPath(); torsoPath(); g.stroke();
  if (isApron) { // barra do avental cobrindo coxas
    const L = legPts(P.nearThigh, P.nearKnee, 2.5);
    blob(g, () => { g.moveTo(hipX - 6, hipY + 1); g.lineTo(hipX + tw * 0.95, hipY + 1); g.lineTo(L.kx + 6, L.ky - 2); g.lineTo(L.kx - 7, L.ky - 1); g.closePath(); }, spec.apron!, 1.8);
  }
  if (spec.towel) blob(g, () => { g.roundRect(shX - tw * 0.6, shY - 3, 8, 14, 2); }, '#e9e4d6', 1.6);
  if (spec.bag) { g.strokeStyle = shade(spec.bag, 0.7); g.lineWidth = 2.5; g.beginPath(); g.moveTo(shX + tw * 0.6, shY + 1); g.lineTo(hipX - tw * 0.8, hipY - 4); g.stroke(); }

  // 4) Cabeça
  // Pescoço
  limb(g, [shX + 1, shY + 2, headX - 0.5, headY + headR - 1], 6.5, skinShade, 2);
  // Cabelo de trás (antes da cabeça)
  if (spec.hairStyle === 'curly') blob(g, () => { for (const [dx, dy, rr] of [[-6, -6, 8], [0, -9, 8], [6, -7, 7], [-9, 1, 7], [-4, 3, 6]] as const) { g.moveTo(headX + dx + rr, headY + dy); g.arc(headX + dx, headY + dy, rr, 0, Math.PI * 2); } }, spec.hair, 2);
  if (spec.hairStyle === 'long') blob(g, () => { g.moveTo(headX - 9, headY - 6); g.quadraticCurveTo(headX - 15, headY + 8, headX - 10, headY + 19); g.lineTo(headX - 2, headY + 16); g.lineTo(headX - 1, headY - 8); g.closePath(); }, spec.hair, 2);
  if (spec.hairStyle === 'ponytail') {
    const sw = P.sway;
    blob(g, () => { g.moveTo(headX - 8, headY - 5); g.quadraticCurveTo(headX - 17 - sw, headY + 2, headX - 15 - sw * 1.5, headY + 15); g.quadraticCurveTo(headX - 11, headY + 6, headX - 6, headY - 1); g.closePath(); }, spec.hair, 2);
  }
  if (spec.hairStyle === 'braids') {
    for (let i = 0; i < 3; i++) limb(g, [headX - 6 + i * 2, headY - 2, headX - 9 + i * 2 - P.sway * 0.4, headY + 16 + i], 2.6, spec.hair, 1.2);
  }
  if (spec.hairStyle === 'bun') blob(g, () => { g.arc(headX - 8, headY - 7, 5.2, 0, Math.PI * 2); }, spec.hair, 2);
  // Rosto
  const headPath = () => { g.ellipse(headX, headY, headR * 0.94, headR * 1.05, 0, 0, Math.PI * 2); };
  blob(g, headPath, spec.skin, 2.3);
  g.save(); g.beginPath(); headPath(); g.clip();
  g.fillStyle = skinShade;
  g.beginPath(); g.moveTo(headX - headR - 2, headY - 3); g.lineTo(headX - 1, headY + 2); g.lineTo(headX + 3, headY + headR + 3); g.lineTo(headX - headR - 2, headY + headR + 3); g.closePath(); g.fill();
  if (spec.stubble) { g.fillStyle = 'rgba(20,14,10,0.35)'; g.beginPath(); g.ellipse(headX + 3, headY + 7, 8, 4.5, 0, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(255,197,107,0.6)'; g.lineWidth = 1.4; g.beginPath(); g.arc(headX, headY, headR - 0.8, -0.9, 0.6); g.stroke();
  g.restore();
  // Nariz
  blob(g, () => { g.moveTo(headX + headR * 0.86, headY - 1); g.lineTo(headX + headR + 2.4, headY + 3.4); g.lineTo(headX + headR * 0.82, headY + 4.4); }, spec.skin, 1.8);
  // Orelha
  blob(g, () => { g.ellipse(headX - 2.5, headY + 1, 2.2, 3, 0, 0, Math.PI * 2); }, skinShade, 1.6);
  if (spec.earring) { g.fillStyle = PAL.amber3; g.beginPath(); g.arc(headX - 2.5, headY + 4.6, 1.2, 0, Math.PI * 2); g.fill(); }
  // Olho e sobrancelha
  const eyeY = headY - 1 + (P.phone ? 1.2 : 0);
  g.fillStyle = INK; g.beginPath(); g.ellipse(headX + 5.2, eyeY, 1.25, P.phone ? 0.7 : 1.7, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = shade(spec.hair, 0.6); g.lineWidth = 1.6; g.beginPath(); g.moveTo(headX + 2.6, headY - 4.6); g.lineTo(headX + 8, headY - 5.1); g.stroke();
  if (spec.glasses) { g.strokeStyle = INK; g.lineWidth = 1.3; g.strokeRect(headX + 2.8, headY - 3.2, 5.4, 3.8); g.beginPath(); g.moveTo(headX + 2.8, headY - 2); g.lineTo(headX - 1.5, headY - 1); g.stroke(); }
  // Boca / bigode
  g.strokeStyle = INK; g.lineWidth = 1.3; g.beginPath(); g.moveTo(headX + 5.2, headY + 6.6); g.lineTo(headX + 8.2, headY + 6.2); g.stroke();
  if (spec.mustache) blob(g, () => { g.moveTo(headX + 4, headY + 4.8); g.quadraticCurveTo(headX + 7.5, headY + 3.6, headX + 10.2, headY + 5.4); g.quadraticCurveTo(headX + 7, headY + 6.2, headX + 4, headY + 5.6); }, spec.hairStyle === 'bald' ? '#2a211b' : spec.hair, 1.2);
  // Cabelo de cima
  const capTop = () => { g.moveTo(headX - headR - 0.5, headY + 1); g.quadraticCurveTo(headX - headR - 1, headY - headR - 2, headX + 2, headY - headR - 1.5); g.quadraticCurveTo(headX + headR + 1, headY - headR + 1, headX + headR - 0.5, headY - 4); g.quadraticCurveTo(headX + 1, headY - 6.5, headX - 3.5, headY - 3); g.quadraticCurveTo(headX - 6, headY + 1, headX - headR - 0.5, headY + 1); g.closePath(); };
  if (spec.hairStyle === 'short' || spec.hairStyle === 'ponytail' || spec.hairStyle === 'bun' || spec.hairStyle === 'long' || spec.hairStyle === 'braids') blob(g, capTop, spec.hair, 2);
  if (spec.hairStyle === 'buzz') { g.save(); g.beginPath(); headPath(); g.clip(); g.fillStyle = spec.hair; g.globalAlpha = 0.85; g.beginPath(); capTop(); g.fill(); g.restore(); }
  if (spec.hairStyle === 'curly') blob(g, () => { for (const [dx, dy, rr] of [[-4, -8, 6], [3, -9, 6], [8, -6, 4.5]] as const) { g.moveTo(headX + dx + rr, headY + dy); g.arc(headX + dx, headY + dy, rr, 0, Math.PI * 2); } }, spec.hair, 1.8);
  if (spec.hairStyle === 'bald') { g.fillStyle = 'rgba(255,230,190,0.35)'; g.beginPath(); g.ellipse(headX + 2, headY - 7, 3.5, 1.6, -0.3, 0, Math.PI * 2); g.fill(); }
  if (spec.cap) {
    blob(g, () => { g.moveTo(headX - headR, headY - 2); g.quadraticCurveTo(headX - headR + 1, headY - headR - 4, headX + 2, headY - headR - 2.5); g.quadraticCurveTo(headX + headR, headY - headR, headX + headR - 0.5, headY - 3.5); g.closePath(); }, spec.cap, 2);
    blob(g, () => { g.moveTo(headX + headR - 3, headY - 4.5); g.lineTo(headX + headR + 8, headY - 3); g.lineTo(headX + headR + 6, headY - 1.2); g.lineTo(headX + headR - 3, headY - 2); g.closePath(); }, shade(spec.cap, 0.7), 1.8);
  }
  if (spec.topStyle === 'hoodie') blob(g, () => { g.moveTo(shX - tw + 2, shY + 2); g.quadraticCurveTo(headX - headR - 4, headY + 4, headX - headR + 1, headY + 7); g.lineTo(shX - 1, shY + 1); g.closePath(); }, shade(spec.top, 0.85), 2);
  if (spec.chain) { g.strokeStyle = PAL.amber3; g.lineWidth = 1.2; g.beginPath(); g.arc(shX + 3, shY + 1, 5, 0.2, Math.PI - 0.4); g.stroke(); }

  // 5) Braço da frente
  const A = drawArm(P.nearArm, P.nearElbow, 3, false);
  if (P.phone) {
    blob(g, () => { g.roundRect(A.wx - 1, A.wy - 7, 4, 7, 1); }, '#1a1d20', 1.2);
    g.fillStyle = 'rgba(150,220,255,0.9)'; g.fillRect(A.wx - 0.2, A.wy - 6, 2, 4.6);
  }
}

/** Gera a folha de quadros de um personagem numa escala de arte (pixels por unidade lógica). */
export function paintSheet(spec: CharSpec, artScale: number): HTMLCanvasElement {
  const fw = Math.ceil(FRAME_W * artScale), fh = Math.ceil(FRAME_H * artScale);
  const { c, g } = makeCanvas(fw * FRAME_COUNT, fh);
  for (let f = 0; f < FRAME_COUNT; f++) {
    g.save();
    g.translate(f * fw, 0);
    g.scale(artScale, artScale);
    drawFigure(g, spec, f);
    g.restore();
  }
  return c;
}

/** Retrato quadrado para o diálogo (cabeça e ombros, fundo com retícula). */
export function paintPortrait(spec: CharSpec, size = 256): HTMLCanvasElement {
  const { c, g } = makeCanvas(size, size);
  const bg = g.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, shade(spec.portraitBg, 1.25)); bg.addColorStop(1, shade(spec.portraitBg, 0.55));
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  halftone(g, 0, 0, size, size, 9, 2.1, '#000', 0.25, 0.6);
  g.fillStyle = 'rgba(242,165,65,0.18)';
  g.beginPath(); g.moveTo(size * 0.55, 0); g.lineTo(size, 0); g.lineTo(size, size * 0.7); g.closePath(); g.fill();
  const k = size / 256 * 5.4;
  g.save();
  g.translate(size * 0.47 - 41 * k, size * 0.44 - 30 * k);
  g.scale(k, k);
  drawFigure(g, spec, 0);
  g.restore();
  g.strokeStyle = INK; g.lineWidth = size / 40; g.strokeRect(0, 0, size, size);
  return c;
}
