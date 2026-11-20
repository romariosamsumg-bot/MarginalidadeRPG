/**
 * Vila do Dique — camadas pintadas proceduralmente (originais, sem marcas reais).
 * Coordenadas das fachadas e do chão = coordenadas de mundo (ver src/world/layout.ts).
 */
import { INK, PAL, halftone, hardShadow, makeCanvas, mix, poly, rect, rng, shade, signText, speckle, stains, wobbleLine, type R } from './paint';
import { VILA } from '../world/layout';

export interface Light { x: number; y: number; w: number; h: number; color?: string }
export interface PaintedLayer { canvas: HTMLCanvasElement; lights: Light[] }

const W = VILA.width;
const BASE = 596; // pé das fachadas

/* ------------------------------- Céu ------------------------------- */
export function paintSky(time: 'entardecer' | 'noite'): HTMLCanvasElement {
  const { c, g } = makeCanvas(256, 512);
  const grad = g.createLinearGradient(0, 0, 0, 512);
  if (time === 'entardecer') {
    grad.addColorStop(0, '#0e2630'); grad.addColorStop(0.4, '#2b4d58'); grad.addColorStop(0.68, '#8a5a4a'); grad.addColorStop(0.84, '#d9823f'); grad.addColorStop(1, '#f2b25a');
  } else {
    grad.addColorStop(0, '#03080b'); grad.addColorStop(0.5, '#0a1b22'); grad.addColorStop(0.8, '#183640'); grad.addColorStop(1, '#3b3a2c');
  }
  g.fillStyle = grad; g.fillRect(0, 0, 256, 512);
  const r = rng(time === 'noite' ? 7 : 3);
  if (time === 'noite') {
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(230,235,220,${r.range(0.2, 0.8)})`; g.fillRect(r.next() * 256, r.next() * 300, 1, 1); }
  }
  // Nuvens em faixas (sombra dura)
  for (let i = 0; i < 7; i++) {
    const y = r.range(80, 360), x = r.range(-60, 200), w = r.range(80, 200);
    g.fillStyle = time === 'noite' ? 'rgba(20,40,48,0.55)' : `rgba(${r.int(40, 90)},${r.int(40, 60)},${r.int(50, 70)},0.45)`;
    g.beginPath(); g.ellipse(x + w / 2, y, w / 2, r.range(5, 12), 0, 0, Math.PI * 2); g.fill();
  }
  return c;
}

export function paintMoon(): HTMLCanvasElement {
  const { c, g } = makeCanvas(64, 64);
  const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#efe4c4'; g.beginPath(); g.arc(32, 32, 11, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0a1b22'; g.beginPath(); g.arc(37, 29, 10, 0, Math.PI * 2); g.fill();
  return c;
}

/* ------------------------------ Morro ------------------------------ */
export function paintFar(): PaintedLayer {
  const w = 2300, h = 520;
  const { c, g } = makeCanvas(w, h);
  const r = rng(11);
  const lights: Light[] = [];
  // Contorno do morro
  const ridge: number[] = [];
  for (let x = 0; x <= w; x += 20) ridge.push(x, 190 + Math.sin(x / 260) * 70 + Math.sin(x / 90) * 18 + Math.cos(x / 530) * 60);
  g.fillStyle = '#16323b';
  g.beginPath(); g.moveTo(0, h); for (let i = 0; i < ridge.length; i += 2) g.lineTo(ridge[i]!, ridge[i + 1]!); g.lineTo(w, h); g.closePath(); g.fill();
  // Casinhas empilhadas seguindo o relevo
  const ridgeAt = (x: number) => { const i = Math.max(0, Math.min(ridge.length / 2 - 1, Math.round(x / 20))); return ridge[i * 2 + 1]!; };
  for (let row = 0; row < 16; row++) {
    for (let x = -20; x < w; x += r.range(22, 42)) {
      const top = ridgeAt(x) + 6 + row * 20 + r.range(-6, 6);
      if (top > h - 10) continue;
      const bw = r.range(18, 38), bh = r.range(16, 26);
      const col = mix('#1b3c46', '#244b55', r.next());
      g.fillStyle = col; g.fillRect(x, top, bw, bh);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, top, bw * 0.3, bh);
      g.fillStyle = '#10262d'; g.fillRect(x - 1, top - 2, bw + 2, 2.5);
      if (r.chance(0.42)) {
        const lx = x + r.range(3, bw - 6), ly = top + r.range(4, bh - 7);
        g.fillStyle = r.chance(0.8) ? '#f2b25a' : '#cfe6e0';
        g.fillRect(lx, ly, 3, 3);
        if (r.chance(0.12)) lights.push({ x: lx, y: ly, w: 3, h: 3 });
      }
    }
  }
  // Névoa atmosférica sobre a base
  const fog = g.createLinearGradient(0, 260, 0, h);
  fog.addColorStop(0, 'rgba(26,60,70,0)'); fog.addColorStop(1, 'rgba(26,60,70,0.55)');
  g.fillStyle = fog; g.fillRect(0, 0, w, h);
  // Torre de antena com luz vermelha
  const tx = 1640, ty = ridgeAt(1640) - 120;
  g.strokeStyle = '#0d1f25'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(tx - 14, ty + 125); g.lineTo(tx, ty); g.lineTo(tx + 14, ty + 125); g.stroke();
  for (let y = ty + 15; y < ty + 120; y += 14) { g.beginPath(); g.moveTo(tx - 14 * (y - ty) / 125, y); g.lineTo(tx + 14 * (y - ty) / 125, y + 7); g.stroke(); }
  lights.push({ x: tx - 2, y: ty - 3, w: 5, h: 5, color: 'red' });
  return { canvas: c, lights };
}

/* ---------------------------- Prédios fundo ---------------------------- */
export function paintMid(): PaintedLayer {
  const w = 2700, h = 560;
  const { c, g } = makeCanvas(w, h);
  const r = rng(23);
  const lights: Light[] = [];
  let x = -30;
  while (x < w) {
    const bw = r.range(90, 190), bh = r.range(170, 380), top = h - bh;
    const col = mix('#132c34', '#1b3a43', r.next());
    rect(g, x, top, bw, bh, col, '#081419', 3);
    hardShadow(g, x, top, bw, bh, bh * 0.6, 'rgba(0,0,0,0.25)');
    // janelas
    for (let wy = top + 16; wy < h - 30; wy += 26) {
      for (let wx = x + 10; wx < x + bw - 16; wx += 22) {
        if (r.chance(0.25)) {
          const lit = r.chance(0.55);
          g.fillStyle = lit ? (r.chance(0.8) ? '#e8a548' : '#b9d4cf') : '#0c1c22';
          g.fillRect(wx, wy, 10, 13);
          if (lit && r.chance(0.18)) lights.push({ x: wx, y: wy, w: 10, h: 13 });
        }
      }
    }
    // caixas d'água e antenas
    if (r.chance(0.6)) rect(g, x + r.range(10, bw - 40), top - 18, 28, 18, '#21434d', '#081419', 2);
    if (r.chance(0.5)) { g.strokeStyle = '#081419'; g.lineWidth = 2; const ax = x + r.range(10, bw - 10); g.beginPath(); g.moveTo(ax, top); g.lineTo(ax, top - 30); g.moveTo(ax - 8, top - 22); g.lineTo(ax + 8, top - 22); g.stroke(); }
    x += bw + r.range(-10, 8);
  }
  // Painel de propaganda vazio (sem marca)
  rect(g, 1250, 150, 240, 100, '#1d3a43', '#081419', 4);
  rect(g, 1262, 162, 216, 76, '#2b5560', '#081419', 2);
  signText(g, 'ANUNCIE AQUI', 1370, 200, 26, '#d8cfb4');
  g.strokeStyle = '#081419'; g.lineWidth = 4; g.beginPath(); g.moveTo(1300, 250); g.lineTo(1300, 330); g.moveTo(1440, 250); g.lineTo(1440, 330); g.stroke();
  const fog = g.createLinearGradient(0, 200, 0, h);
  fog.addColorStop(0, 'rgba(18,40,48,0)'); fog.addColorStop(1, 'rgba(18,40,48,0.5)');
  g.fillStyle = fog; g.fillRect(0, 0, w, h);
  return { canvas: c, lights };
}

/* ----------------------------- Fachadas ----------------------------- */
function wall(g: CanvasRenderingContext2D, r: R, x: number, y: number, w: number, h: number, color: string, opts: { brick?: number; roof?: boolean } = {}) {
  g.fillStyle = color; g.fillRect(x, y, w, h);
  speckle(g, r, x, y, w, h, Math.floor(w * h / 90), [shade(color, 0.7), shade(color, 1.18), '#000'], 0.28, 2.5);
  stains(g, r, x, y, w, h, Math.floor(w / 26), '#05090b', 0.28);
  // Reboco caído com tijolo aparente
  for (let i = 0; i < (opts.brick ?? 1); i++) {
    const bx = x + r.range(8, w - 80), by = y + r.range(20, h - 60), bw = r.range(40, 90), bh = r.range(26, 50);
    g.save();
    g.beginPath(); g.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, r.range(-0.3, 0.3), 0, Math.PI * 2); g.clip();
    g.fillStyle = PAL.brick1; g.fillRect(bx - 4, by - 4, bw + 8, bh + 8);
    g.strokeStyle = PAL.brick0; g.lineWidth = 1.5;
    for (let yy = by; yy < by + bh + 8; yy += 7) { g.beginPath(); g.moveTo(bx - 4, yy); g.lineTo(bx + bw + 4, yy); g.stroke(); for (let xx = bx + ((yy / 7) % 2) * 8; xx < bx + bw; xx += 16) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 7); g.stroke(); } }
    g.restore();
    g.strokeStyle = shade(color, 0.55); g.lineWidth = 1.5; g.beginPath(); g.ellipse(bx + bw / 2, by + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2); g.stroke();
  }
  // Sombra dura sob a laje/beiral
  g.fillStyle = 'rgba(3,9,12,0.42)'; g.fillRect(x, y, w, 14);
  halftone(g, x, y + 14, w, 18, 5, 1, '#000', 0.25);
  g.lineWidth = 3; g.strokeStyle = INK; g.strokeRect(x, y, w, h);
  if (opts.roof !== false) rect(g, x - 8, y - 10, w + 16, 12, shade(color, 0.75), INK, 3);
}

function windowAt(g: CanvasRenderingContext2D, r: R, x: number, y: number, w: number, h: number, lit: boolean, lights: Light[], grade = true, curtain?: string) {
  rect(g, x - 5, y - 5, w + 10, h + 10, '#2c3638', INK, 3);
  if (lit) {
    const gr = g.createLinearGradient(x, y, x, y + h);
    gr.addColorStop(0, '#ffd48a'); gr.addColorStop(1, '#e08a2c');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    lights.push({ x, y, w, h });
  } else {
    g.fillStyle = '#0b1a20'; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(90,150,160,0.25)'; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.7, y); g.lineTo(x + w * 0.2, y + h); g.fill();
  }
  if (curtain) { g.fillStyle = curtain; g.fillRect(x, y, w * 0.32, h); g.fillRect(x + w * 0.68, y, w * 0.32, h); }
  if (grade) {
    g.strokeStyle = INK; g.lineWidth = 2.5;
    for (let gx = x + w / 4; gx < x + w; gx += w / 4) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + h); g.stroke(); }
    g.beginPath(); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke();
  }
  rect(g, x - 8, y + h + 4, w + 16, 6, '#5b6563', INK, 2);
  void r;
}

function shutter(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  rect(g, x, y, w, h, color, INK, 3);
  g.strokeStyle = shade(color, 0.6); g.lineWidth = 2;
  for (let yy = y + 6; yy < y + h; yy += 7) { g.beginPath(); g.moveTo(x + 2, yy); g.lineTo(x + w - 2, yy); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, y, w * 0.12, h);
}

function poster(g: CanvasRenderingContext2D, r: R, x: number, y: number, w: number, h: number, lines: string[], bg: string, fg = INK) {
  g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(r.range(-0.06, 0.06));
  rect(g, -w / 2, -h / 2, w, h, bg, INK, 2);
  lines.forEach((ln, i) => signText(g, ln, 0, -h / 2 + 12 + i * (h - 16) / Math.max(1, lines.length), i === 0 ? 13 : 10, fg === INK ? '#1b1b1b' : fg, 'Arial, sans-serif', 'center', '800'));
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(-w / 2, h / 2 - 6, w, 6);
  g.restore();
}

function tag(g: CanvasRenderingContext2D, r: R, x: number, y: number, color: string) {
  // pichação abstrata (sem palavras)
  g.save(); g.strokeStyle = color; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y);
  for (let i = 0; i < 6; i++) g.quadraticCurveTo(x + i * 14 + r.range(-6, 14), y + r.range(-26, 22), x + (i + 1) * 14, y + r.range(-10, 10));
  g.stroke();
  g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  g.restore();
}

function caixaDagua(g: CanvasRenderingContext2D, x: number, y: number) {
  rect(g, x, y + 30, 70, 8, '#3c4446', INK, 2);
  g.fillStyle = '#2c6f8f'; g.beginPath(); g.moveTo(x + 4, y + 30); g.lineTo(x + 10, y); g.lineTo(x + 60, y); g.lineTo(x + 66, y + 30); g.closePath(); g.fill();
  g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 8, y + 2, 14, 28);
  rect(g, x + 8, y - 6, 54, 8, '#3483a8', INK, 2);
}

export interface FacadeResult extends PaintedLayer { neon: Light; sign: Light }

export function paintFacades(): FacadeResult {
  const { c, g } = makeCanvas(W, 610);
  const r = rng(97);
  const lights: Light[] = [];

  // 0 — Muro de fim de rua com escadaria fechada
  wall(g, r, 0, 300, 200, BASE - 300, '#59605a', { brick: 2 });
  for (let i = 0; i < 9; i++) rect(g, 20 + i * 8, 300 + i * 30, 120 - i * 8, 10, '#6c726c', INK, 2);
  rect(g, 30, 420, 130, BASE - 420, '#1a2225', INK, 3);
  g.strokeStyle = '#3c4446'; g.lineWidth = 3; for (let gx = 40; gx < 160; gx += 12) { g.beginPath(); g.moveTo(gx, 424); g.lineTo(gx, BASE - 2); g.stroke(); }
  tag(g, r, 20, 380, PAL.red2);

  // 1 — Sua casa (dois andares, laje com varal e caixa d'água)
  wall(g, r, 200, 250, 440, BASE - 250, '#3f7f87', { brick: 2 });
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(200, 410, 440, 6);
  windowAt(g, r, 250, 300, 80, 70, false, lights, true);
  windowAt(g, r, 470, 300, 90, 70, true, lights, true, '#7a2f3a');
  windowAt(g, r, 520, 455, 70, 60, true, lights, true);
  // porta (portão de ferro)
  rect(g, 352, 440, 96, BASE - 440, '#1f2a2c', INK, 3);
  g.strokeStyle = '#4c5759'; g.lineWidth = 3;
  for (let gx = 362; gx < 446; gx += 11) { g.beginPath(); g.moveTo(gx, 446); g.lineTo(gx, BASE - 4); g.stroke(); }
  rect(g, 352, 440, 96, 10, '#2e393b', INK, 2);
  signText(g, '47', 400, 425, 18, PAL.paper, 'Georgia, serif');
  rect(g, 338, BASE - 12, 124, 12, '#6a6f6a', INK, 2); // degrau
  caixaDagua(g, 520, 194);
  // varal (as roupas são sprites animados)
  g.strokeStyle = '#222'; g.lineWidth = 2; g.beginPath(); g.moveTo(230, 210); g.lineTo(230, 250); g.moveTo(470, 210); g.lineTo(470, 250); g.moveTo(230, 214); g.quadraticCurveTo(350, 226, 470, 214); g.stroke();
  // ar-condicionado e vaso
  rect(g, 270, 390, 46, 26, '#c9c4b6', INK, 2);
  rect(g, 610, 560, 26, 34, '#8a4a35', INK, 2);
  g.fillStyle = '#2f5a3a'; g.beginPath(); g.arc(623, 552, 16, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();

  // 2 — Oficina 24
  wall(g, r, 650, 330, 520, BASE - 330, '#58615f', { brick: 1 });
  // andar de cima inacabado (tijolo aparente)
  g.fillStyle = PAL.brick2; g.fillRect(660, 230, 380, 100);
  g.strokeStyle = PAL.brick0; g.lineWidth = 1.6;
  for (let yy = 230; yy < 330; yy += 10) { g.beginPath(); g.moveTo(660, yy); g.lineTo(1040, yy); g.stroke(); for (let xx = 660 + ((yy / 10) % 2) * 12; xx < 1040; xx += 24) { g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx, yy + 10); g.stroke(); } }
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(660, 230, 380, 100);
  for (const vx of [700, 860, 1000]) { g.fillStyle = '#1a2022'; g.fillRect(vx - 3, 200, 6, 30); }
  windowAt(g, r, 760, 254, 70, 52, false, lights, false);
  windowAt(g, r, 900, 254, 70, 52, true, lights, false);
  // interior aberto da oficina
  rect(g, 712, 430, 380, BASE - 430, '#151b1d', INK, 3);
  g.fillStyle = 'rgba(242,165,65,0.22)'; g.fillRect(714, 432, 376, BASE - 434);
  for (let i = 0; i < 6; i++) { g.strokeStyle = '#3a4244'; g.lineWidth = 3; g.beginPath(); g.moveTo(740 + i * 22, 448); g.lineTo(740 + i * 22, 470 + (i % 3) * 8); g.stroke(); } // ferramentas
  for (let i = 0; i < 3; i++) { g.strokeStyle = INK; g.lineWidth = 7; g.beginPath(); g.arc(1010 + i * 22, 470 + i * 6, 15, 0, Math.PI * 2); g.stroke(); g.strokeStyle = '#2b2b2b'; g.lineWidth = 4; g.stroke(); }
  rect(g, 760, 520, 160, 14, '#5a3e2a', INK, 2); // bancada
  rect(g, 780, 534, 10, BASE - 534, '#3a2a1e', INK, 2); rect(g, 890, 534, 10, BASE - 534, '#3a2a1e', INK, 2);
  lights.push({ x: 820, y: 436, w: 120, h: 24, color: 'warm' });
  shutter(g, 712, 410, 380, 24, '#6a7672'); // porta de aço recolhida
  rect(g, 760, 350, 290, 52, PAL.amber2, INK, 4);
  signText(g, 'OFICINA 24', 905, 377, 34, '#1a1a1a', undefined, 'center');
  g.fillStyle = INK; g.font = '800 11px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('CONSERTO DE MOTOS · BORRACHARIA', 905, 397);
  poster(g, r, 1105, 470, 50, 60, ['VENDE', 'SE', 'MOTO'], '#e2d9c3');

  // 3 — Praça da Passarela (passarela ao fundo + muro com lambe-lambes)
  // estrutura da passarela
  g.fillStyle = '#4b5553';
  g.fillRect(1170, 250, 400, 22);
  g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(1170, 250, 400, 22);
  g.strokeStyle = '#2a3133'; g.lineWidth = 2;
  for (let xx = 1175; xx < 1570; xx += 14) { g.beginPath(); g.moveTo(xx, 228); g.lineTo(xx, 250); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(1170, 228); g.lineTo(1570, 228); g.stroke();
  rect(g, 1200, 272, 26, BASE - 380, '#555f5d', INK, 3);
  // escada em zigue-zague
  for (let i = 0; i < 8; i++) poly(g, [1500 + i * 0, 272 + i * 34, 1560, 272 + i * 34, 1560, 280 + i * 34, 1500, 280 + i * 34], '#5f6866', INK, 2);
  rect(g, 1553, 272, 12, 290, '#4b5553', INK, 2);
  // muro baixo com lambe-lambes
  wall(g, r, 1170, 470, 390, BASE - 470, '#6d6a5e', { brick: 1, roof: false });
  poster(g, r, 1190, 486, 64, 46, ['BAILE', 'SÁBADO'], PAL.red2, '#fff');
  poster(g, r, 1440, 484, 56, 44, ['ALUGA-SE', 'QUARTO'], '#e2d9c3');
  poster(g, r, 1500, 520, 48, 40, ['AULAS', 'DE VIOLÃO'], PAL.amber3);
  tag(g, r, 1340, 500, '#e9e4d6');

  // 4 — Bar do Nando (esquina, dois andares)
  wall(g, r, 1570, 260, 480, BASE - 260, '#7a3b33', { brick: 1 });
  windowAt(g, r, 1610, 300, 80, 64, true, lights, true, '#1b4b56');
  windowAt(g, r, 1760, 300, 80, 64, false, lights, true);
  windowAt(g, r, 1910, 300, 80, 64, true, lights, true);
  // varanda
  rect(g, 1590, 384, 440, 10, '#3a3a36', INK, 2);
  g.strokeStyle = INK; g.lineWidth = 2; for (let xx = 1594; xx < 2030; xx += 10) { g.beginPath(); g.moveTo(xx, 394); g.lineTo(xx, 414); g.stroke(); }
  rect(g, 1590, 414, 440, 6, '#3a3a36', INK, 2);
  // térreo aberto: balcão iluminado
  rect(g, 1600, 452, 140, BASE - 452, '#2a1b16', INK, 3);
  g.fillStyle = 'rgba(255,190,100,0.55)'; g.fillRect(1602, 454, 136, BASE - 456);
  for (let i = 0; i < 6; i++) { g.fillStyle = r.pick(['#5a7a3a', '#7a2f3a', '#c8a24a', '#2a6672']); g.fillRect(1612 + i * 20, 470, 9, 20); }
  rect(g, 1602, 520, 136, 12, '#5a3e2a', INK, 2);
  lights.push({ x: 1602, y: 454, w: 136, h: 140, color: 'warm' });
  // porta do bar
  rect(g, 1722, 440, 92, BASE - 440, '#16100d', INK, 3);
  g.fillStyle = 'rgba(255,180,90,0.45)'; g.fillRect(1726, 444, 84, BASE - 446);
  shutter(g, 1722, 424, 92, 18, '#6a5e52');
  // segunda abertura com porta de aço meio baixada
  shutter(g, 1840, 440, 180, 70, '#6a7672');
  rect(g, 1840, 510, 180, BASE - 510, '#1a120e', INK, 3);
  g.fillStyle = 'rgba(255,190,100,0.4)'; g.fillRect(1842, 512, 176, BASE - 514);
  lights.push({ x: 1842, y: 512, w: 176, h: 80, color: 'warm' });
  // placa
  rect(g, 1620, 228, 380, 26, PAL.paper, INK, 3);
  signText(g, 'BAR DO NANDO', 1810, 241, 22, PAL.red1);
  const neon: Light = { x: 1960, y: 440, w: 70, h: 40 };
  const sign: Light = { x: 1990, y: 440, w: 0, h: 0 };

  // 5 — Ponto comercial vazio
  wall(g, r, 2050, 330, 220, BASE - 330, '#4a5a5e', { brick: 1 });
  shutter(g, 2080, 440, 160, BASE - 440, '#56625f');
  poster(g, r, 2120, 470, 80, 46, ['ALUGA-SE', 'TRATAR AQUI'], '#e9e4d6');
  windowAt(g, r, 2110, 360, 100, 54, false, lights, true);

  // 6 — Mercearia da Solange (toldo listrado)
  wall(g, r, 2270, 280, 360, BASE - 280, '#b39a6a', { brick: 2 });
  windowAt(g, r, 2310, 310, 80, 60, true, lights, true, '#2a6672');
  windowAt(g, r, 2500, 310, 80, 60, false, lights, true);
  rect(g, 2300, 440, 300, BASE - 440, '#1a1712', INK, 3);
  g.fillStyle = 'rgba(255,215,150,0.45)'; g.fillRect(2302, 442, 296, BASE - 444);
  // prateleiras abstratas
  for (let sy = 452; sy < 560; sy += 26) { rect(g, 2310, sy + 18, 280, 5, '#4a3a2a', INK, 1.5); for (let sx = 2316; sx < 2585; sx += 13) { g.fillStyle = r.pick(['#c8323c', '#e8c65a', '#5a8a4a', '#e9e4d6', '#2a6672', '#d98b25']); g.fillRect(sx, sy + r.range(2, 6), 9, 16 - r.range(0, 5)); } }
  lights.push({ x: 2302, y: 442, w: 296, h: 150, color: 'warm' });
  // toldo
  for (let i = 0; i < 12; i++) poly(g, [2290 + i * 27, 400, 2317 + i * 27, 400, 2321 + i * 27, 436, 2294 + i * 27, 436], i % 2 ? '#e2d9c3' : PAL.red1, INK, 1.5);
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(2290, 420, 330, 16);
  rect(g, 2300, 376, 300, 24, PAL.petrol2, INK, 3);
  signText(g, 'MERCEARIA DA SOLANGE', 2450, 388, 17, PAL.amber3);
  rect(g, 2540, 520, 74, 40, PAL.amber2, INK, 2);
  g.fillStyle = INK; g.font = '800 9px Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('CORRESPONDENTE', 2577, 534); g.fillText('BANCÁRIO', 2577, 546);

  // 7 — Muro da avenida e saída
  wall(g, r, 2630, 400, 270, BASE - 400, '#5c625c', { brick: 1 });
  tag(g, r, 2650, 470, PAL.amber2);
  rect(g, 2790, 430, 90, 50, '#245a3a', INK, 3);
  signText(g, 'AV. DO DIQUE →', 2835, 455, 11, '#e9e4d6', 'Arial, sans-serif');

  return { canvas: c, lights, neon, sign };
}

/* ------------------------------- Chão ------------------------------- */
export const GROUND_Y = 586;
export function paintGround(): { canvas: HTMLCanvasElement; puddles: Light[] } {
  const H = 960 - GROUND_Y;
  const { c, g } = makeCanvas(W, H);
  const r = rng(51);
  const Y = (wy: number) => wy - GROUND_Y;
  // Calçada
  g.fillStyle = '#5a6362'; g.fillRect(0, Y(586), W, Y(690) - Y(586));
  speckle(g, r, 0, Y(586), W, 104, 9000, ['#4a5352', '#6c7472', '#3c4443'], 0.5, 2.2);
  g.strokeStyle = '#3e4746'; g.lineWidth = 2;
  for (const yy of [628, 662]) { g.beginPath(); g.moveTo(0, Y(yy)); g.lineTo(W, Y(yy)); g.stroke(); }
  for (let xx = 0; xx < W; xx += 96) { g.beginPath(); g.moveTo(xx + r.range(-3, 3), Y(596)); g.lineTo(xx, Y(690)); g.stroke(); }
  // rachaduras e mato
  g.strokeStyle = '#2e3535'; g.lineWidth = 1.5;
  for (let i = 0; i < 40; i++) { const x = r.range(0, W); wobbleLine(g, r, x, Y(r.range(600, 680)), x + r.range(-50, 50), Y(r.range(600, 688)), 4, 5); }
  for (let i = 0; i < 60; i++) { const x = r.range(0, W); g.strokeStyle = '#3f6a3a'; g.lineWidth = 1.5; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 2, Y(598)); g.lineTo(x + k * 2 + r.range(-4, 4), Y(598) - r.range(4, 10)); g.stroke(); } }
  // sombra junto às fachadas
  const sh = g.createLinearGradient(0, Y(586), 0, Y(626));
  sh.addColorStop(0, 'rgba(0,0,0,0.6)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(0, Y(586), W, 40);
  // Meio-fio
  g.fillStyle = '#7d8580'; g.fillRect(0, Y(690), W, 8);
  g.fillStyle = '#3e4544'; g.fillRect(0, Y(698), W, 9);
  for (let xx = 0; xx < W; xx += 60) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(xx, Y(690), 2, 17); }
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Y(690)); g.lineTo(W, Y(690)); g.moveTo(0, Y(707)); g.lineTo(W, Y(707)); g.stroke();
  // Asfalto
  const asp = g.createLinearGradient(0, Y(707), 0, H);
  asp.addColorStop(0, '#1d272a'); asp.addColorStop(1, '#151d20');
  g.fillStyle = asp; g.fillRect(0, Y(707), W, H - Y(707));
  speckle(g, r, 0, Y(707), W, H - Y(707), 14000, ['#0e1416', '#2a3538', '#33403f'], 0.5, 2);
  // remendos
  for (let i = 0; i < 14; i++) { const x = r.range(0, W - 160), y = r.range(720, 900); poly(g, [x, Y(y), x + r.range(80, 160), Y(y + r.range(-6, 6)), x + r.range(90, 170), Y(y + r.range(20, 40)), x + r.range(-10, 10), Y(y + r.range(24, 44))], 'rgba(40,52,55,0.6)', 'rgba(8,12,14,0.6)', 1.5); }
  // faixa central tracejada, gasta
  g.fillStyle = 'rgba(220,214,190,0.35)';
  for (let xx = 20; xx < W; xx += 120) { g.save(); g.globalAlpha = r.range(0.35, 1); g.fillRect(xx, Y(842), 60, 5); g.restore(); }
  // bueiro
  for (const bx of [1590, 560]) {
    g.fillStyle = '#0b0f10'; g.beginPath(); g.ellipse(bx, Y(770), 34, 11, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a4547'; g.lineWidth = 2; for (let k = -24; k <= 24; k += 8) { g.beginPath(); g.moveTo(bx + k, Y(762)); g.lineTo(bx + k, Y(778)); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.ellipse(bx, Y(770), 34, 11, 0, 0, Math.PI * 2); g.stroke();
  }
  // Poças com reflexo âmbar perto dos postes
  const puddles: Light[] = [];
  for (const L of VILA.lamps) {
    const px = L.x + r.range(-60, 60), py = r.range(740, 880), pw = r.range(90, 160), ph = r.range(16, 26);
    g.save();
    g.beginPath(); g.ellipse(px, Y(py), pw / 2, ph / 2, 0, 0, Math.PI * 2); g.clip();
    g.fillStyle = '#0c1a20'; g.fillRect(px - pw, Y(py) - ph, pw * 2, ph * 2);
    const rf = g.createLinearGradient(px, Y(py) - ph / 2, px, Y(py) + ph / 2);
    rf.addColorStop(0, 'rgba(255,200,110,0.65)'); rf.addColorStop(1, 'rgba(60,110,120,0.25)');
    g.fillStyle = rf; g.fillRect(px - 6, Y(py) - ph / 2, 12, ph);
    g.restore();
    g.strokeStyle = 'rgba(160,200,200,0.35)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(px, Y(py), pw / 2, ph / 2, 0, 0, Math.PI * 2); g.stroke();
    puddles.push({ x: px, y: py, w: pw, h: ph });
  }
  // Calçada do outro lado (borda inferior da tela)
  g.fillStyle = '#4e5655'; g.fillRect(0, Y(936), W, H - Y(936));
  g.fillStyle = '#6d7471'; g.fillRect(0, Y(930), W, 7);
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(0, Y(930)); g.lineTo(W, Y(930)); g.stroke();
  return { canvas: c, puddles };
}

/* ------------------------------- Fios ------------------------------- */
export function paintWires(): HTMLCanvasElement {
  const { c, g } = makeCanvas(W, 360);
  const r = rng(5);
  const tops = VILA.lamps.map(l => ({ x: l.x, y: l.headY - 6 }));
  g.strokeStyle = '#05080a'; g.lineCap = 'round';
  for (let i = 0; i < tops.length - 1; i++) {
    const a = tops[i]!, b = tops[i + 1]!;
    for (let k = 0; k < 3; k++) {
      g.lineWidth = k === 0 ? 3 : 2;
      g.beginPath(); g.moveTo(a.x, a.y + k * 7); g.quadraticCurveTo((a.x + b.x) / 2, a.y + 46 + k * 9 + r.range(0, 12), b.x, b.y + k * 7); g.stroke();
    }
  }
  // fios até as casas
  for (const t of tops) {
    for (let k = 0; k < 2; k++) { const tx = t.x + r.range(-160, 160); g.lineWidth = 1.5; g.beginPath(); g.moveTo(t.x, t.y + 10); g.quadraticCurveTo((t.x + tx) / 2, t.y + 60, tx, 260 + r.range(-20, 40)); g.stroke(); }
  }
  // par de tênis pendurado
  const sx = 1290, sy = 352;
  g.lineWidth = 1.2; g.beginPath(); g.moveTo(sx, sy - 34); g.lineTo(sx - 6, sy - 6); g.moveTo(sx, sy - 34); g.lineTo(sx + 7, sy - 4); g.stroke();
  for (const [dx, dy] of [[-8, -6], [6, -4]] as const) { g.fillStyle = PAL.white; g.beginPath(); g.ellipse(sx + dx, sy + dy, 7, 4, 0.4, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); }
  return c;
}
