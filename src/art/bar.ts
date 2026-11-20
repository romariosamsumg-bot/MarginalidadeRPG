/** Interior do Bar do Nando — parede, prateleiras, TV, piso de ladrilho. */
import { INK, PAL, halftone, makeCanvas, rect, rng, shade, signText, speckle, stains } from './paint';
import type { Light } from './vila';
import { BAR } from '../world/layout';

export function paintBarRoom(): { canvas: HTMLCanvasElement; lights: Light[]; tv: Light } {
  const W = BAR.width, H = BAR.height, FLOOR = 452;
  const { c, g } = makeCanvas(W, H);
  const r = rng(404);
  const lights: Light[] = [];
  // Parede: barra de azulejo embaixo, tinta descascada em cima
  g.fillStyle = '#6e4a3a'; g.fillRect(0, 0, W, FLOOR);
  speckle(g, r, 0, 0, W, FLOOR, 5000, ['#5a3a2c', '#7e5a48', '#000'], 0.3, 2.5);
  stains(g, r, 0, 0, W, FLOOR, 40, '#140a06', 0.25);
  g.fillStyle = '#d9cfb8'; g.fillRect(0, 300, W, FLOOR - 300);
  g.strokeStyle = '#a89c80'; g.lineWidth = 1.5;
  for (let y = 300; y < FLOOR; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  for (let x = 0; x < W; x += 22) { g.beginPath(); g.moveTo(x, 300); g.lineTo(x, FLOOR); g.stroke(); }
  speckle(g, r, 0, 300, W, FLOOR - 300, 900, ['#7a6e58', '#000'], 0.3, 2);
  rect(g, 0, 292, W, 10, PAL.petrol2, INK, 2);
  // Teto e viga
  g.fillStyle = '#2a1c16'; g.fillRect(0, 0, W, 40);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, 40, W, 20);
  halftone(g, 0, 40, W, 40, 6, 1.4, '#000', 0.3);
  // Prateleiras atrás do balcão (garrafas genéricas, sem rótulos)
  rect(g, 110, 120, 520, 170, '#3a2418', INK, 3);
  for (let s = 0; s < 3; s++) {
    const y = 160 + s * 50;
    rect(g, 116, y, 508, 8, '#7a5232', INK, 2);
    for (let x = 128; x < 610; x += r.range(16, 26)) {
      const h = r.range(22, 34), col = r.pick(['#3a6a3a', '#6a2a1a', '#c8a24a', '#2a5a6a', '#d9cfb8', '#5a1a2a']);
      rect(g, x, y - h, 10, h, col, INK, 1.5);
      rect(g, x + 3, y - h - 8, 4, 8, col, INK, 1.2);
      g.fillStyle = 'rgba(255,230,180,0.35)'; g.fillRect(x + 6, y - h + 3, 2, h - 6);
    }
  }
  // Espelho e quadro
  rect(g, 680, 110, 160, 110, '#1b3a43', INK, 4);
  g.fillStyle = 'rgba(160,210,220,0.18)'; g.beginPath(); g.moveTo(690, 210); g.lineTo(760, 120); g.lineTo(790, 120); g.lineTo(720, 210); g.fill();
  rect(g, 680, 236, 160, 40, PAL.paper, INK, 3);
  g.fillStyle = INK; g.font = '800 12px Arial, sans-serif'; g.textAlign = 'center';
  g.fillText('PF R$ 18 · PASTEL R$ 7', 760, 252); g.fillText('FIADO SÓ AMANHÃ', 760, 268);
  // TV na parede
  const tv: Light = { x: 920, y: 120, w: 150, h: 96 };
  rect(g, 900, 108, 190, 120, '#111416', INK, 4);
  g.fillStyle = '#0c1a20'; g.fillRect(tv.x, tv.y, tv.w, tv.h);
  rect(g, 985, 228, 20, 30, '#2a2f30', INK, 2);
  // Porta de saída (fundo, à direita)
  rect(g, 1086, 230, 110, FLOOR - 230, '#1a120e', INK, 4);
  g.fillStyle = 'rgba(30,70,90,0.55)'; g.fillRect(1092, 236, 98, FLOOR - 236);
  g.fillStyle = 'rgba(255,190,100,0.25)'; g.fillRect(1092, 236, 98, 40);
  rect(g, 1080, 210, 122, 24, '#7a2f3a', INK, 3);
  signText(g, 'SAÍDA', 1141, 222, 15, PAL.paper, 'Arial, sans-serif');
  // Pôsteres e calendário
  rect(g, 40, 110, 50, 70, PAL.amber2, INK, 2); signText(g, 'SAMBA', 65, 135, 12, INK, 'Arial, sans-serif'); signText(g, 'SEXTA', 65, 155, 10, INK, 'Arial, sans-serif');
  rect(g, 870, 260, 60, 30, '#e9e4d6', INK, 2);
  // Piso de ladrilho em perspectiva
  const fl = g.createLinearGradient(0, FLOOR, 0, H);
  fl.addColorStop(0, '#5a4636'); fl.addColorStop(1, '#3a2c22');
  g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
  for (let row = 0; row < 12; row++) {
    const y0 = FLOOR + Math.pow(row / 12, 1.25) * (H - FLOOR), y1 = FLOOR + Math.pow((row + 1) / 12, 1.25) * (H - FLOOR);
    for (let col = -2; col < 30; col++) {
      const shift = (col - 14) * (y0 - FLOOR) * 0.04;
      const x0 = col * 48 + shift, x1 = (col + 1) * 48 + (col + 1 - 14) * (y0 - FLOOR) * 0.04;
      if ((row + col) % 2) { g.fillStyle = 'rgba(217,207,184,0.22)'; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    }
  }
  speckle(g, r, 0, FLOOR, W, H - FLOOR, 3000, ['#000', '#7a6a5a'], 0.3, 2);
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, FLOOR, W, 10);
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(0, FLOOR); g.lineTo(W, FLOOR); g.stroke();
  // Vinheta nas bordas
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // Lâmpadas penduradas
  for (const L of BAR.lamps) {
    g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x, 40); g.lineTo(L.x, L.headY); g.stroke();
    g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(L.x, L.headY + 6, 7, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.stroke();
    rect(g, L.x - 14, L.headY - 6, 28, 8, '#2a2f30', INK, 2);
    lights.push({ x: L.x, y: L.headY + 6, w: 0, h: 0 });
  }
  void shade;
  return { canvas: c, lights, tv };
}
