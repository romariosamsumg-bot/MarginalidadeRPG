/** Interior da casa de Lia — sala/cozinha conjugada, pintada proceduralmente. */
import { INK, PAL, halftone, makeCanvas, poly, rect, rng, signText, speckle, stains } from './paint';
import { CASA } from '../world/layout';

export function paintCasaRoom(): { canvas: HTMLCanvasElement; window: { x: number; y: number; w: number; h: number } } {
  const W = CASA.width, H = CASA.height, FLOOR = 438;
  const { c, g } = makeCanvas(W, H);
  const r = rng(808);
  // Paredes: azul-petróleo desbotado, mesma cor da fachada
  g.fillStyle = '#3c727a'; g.fillRect(0, 0, W, FLOOR);
  speckle(g, r, 0, 0, W, FLOOR, 4000, ['#2f5f66', '#4b858c', '#000'], 0.28, 2.5);
  stains(g, r, 0, 0, W, FLOOR, 28, '#0b1a1d', 0.22);
  // Azulejo da cozinha (lado esquerdo)
  g.fillStyle = '#d9d3c2'; g.fillRect(60, 250, 330, FLOOR - 250);
  g.strokeStyle = '#a79f88'; g.lineWidth = 1.4;
  for (let y = 250; y < FLOOR; y += 20) { g.beginPath(); g.moveTo(60, y); g.lineTo(390, y); g.stroke(); }
  for (let x = 60; x < 390; x += 20) { g.beginPath(); g.moveTo(x, 250); g.lineTo(x, FLOOR); g.stroke(); }
  g.strokeStyle = INK; g.lineWidth = 2.5; g.strokeRect(60, 250, 330, FLOOR - 250);
  // Pia e armário
  rect(g, 240, 330, 150, 108, '#7a5a3e', INK, 3);
  rect(g, 236, 318, 158, 16, '#b9b7ae', INK, 2.5);
  rect(g, 290, 290, 8, 30, '#8a8f8c', INK, 1.5); rect(g, 290, 290, 26, 6, '#8a8f8c', INK, 1.5);
  for (const x of [250, 320]) { rect(g, x, 350, 60, 80, '#6b4e35', INK, 2); g.fillStyle = PAL.amber3; g.fillRect(x + 50, 385, 4, 10); }
  // Prateleira com potes e plantas
  rect(g, 80, 190, 140, 8, '#6b4e35', INK, 2);
  for (let i = 0; i < 5; i++) rect(g, 88 + i * 26, 168, 18, 22, r.pick(['#c8323c', '#e8c65a', '#e9e4d6', '#2a6672']), INK, 1.5);
  // Janela com cortina (luz da rua)
  const win = { x: 470, y: 120, w: 180, h: 130 };
  rect(g, win.x - 8, win.y - 8, win.w + 16, win.h + 16, '#2c3638', INK, 3);
  const sky = g.createLinearGradient(0, win.y, 0, win.y + win.h);
  sky.addColorStop(0, '#0e2630'); sky.addColorStop(1, '#c86a3a');
  g.fillStyle = sky; g.fillRect(win.x, win.y, win.w, win.h);
  for (let i = 0; i < 8; i++) { g.fillStyle = '#122c33'; const bx = win.x + i * 24, bh = r.range(30, 70); g.fillRect(bx, win.y + win.h - bh, 22, bh); if (r.chance(0.6)) { g.fillStyle = PAL.amber3; g.fillRect(bx + 6, win.y + win.h - bh + 10, 4, 4); } }
  g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(win.x + win.w / 2, win.y); g.lineTo(win.x + win.w / 2, win.y + win.h); g.moveTo(win.x, win.y + win.h / 2); g.lineTo(win.x + win.w, win.y + win.h / 2); g.stroke();
  g.fillStyle = '#7a2f3a'; g.fillRect(win.x - 14, win.y - 14, 40, win.h + 30); g.fillRect(win.x + win.w - 26, win.y - 14, 40, win.h + 30);
  g.strokeStyle = INK; g.lineWidth = 2; g.strokeRect(win.x - 14, win.y - 14, 40, win.h + 30); g.strokeRect(win.x + win.w - 26, win.y - 14, 40, win.h + 30);
  // Calendário, quadros de família (silhuetas), relógio
  rect(g, 700, 110, 56, 70, '#e9e4d6', INK, 2); g.fillStyle = PAL.red2; g.fillRect(700, 110, 56, 16);
  g.fillStyle = '#333'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) g.fillRect(706 + i * 12, 132 + j * 11, 6, 6);
  for (const [x, y, w, h] of [[780, 120, 60, 46], [850, 140, 44, 56]] as const) {
    rect(g, x, y, w, h, '#5a3e2a', INK, 2); rect(g, x + 5, y + 5, w - 10, h - 10, '#c9b08a', null);
    g.fillStyle = '#5a4030'; g.beginPath(); g.arc(x + w / 2, y + h / 2 - 2, 7, 0, Math.PI * 2); g.fill(); g.fillRect(x + w / 2 - 9, y + h / 2 + 4, 18, 10);
  }
  g.fillStyle = '#e9e4d6'; g.beginPath(); g.arc(560, 60, 18, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
  g.beginPath(); g.moveTo(560, 60); g.lineTo(560, 48); g.moveTo(560, 60); g.lineTo(569, 64); g.stroke();
  // Porta de entrada (fundo, à direita)
  rect(g, 870, 230, 74, FLOOR - 230, '#5a3e2a', INK, 3);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(870, 230, 20, FLOOR - 230);
  g.fillStyle = PAL.amber3; g.beginPath(); g.arc(932, 340, 4, 0, Math.PI * 2); g.fill();
  signText(g, '47', 907, 255, 14, PAL.paper, 'Georgia, serif');
  // Rodapé e chão de cerâmica
  rect(g, 0, FLOOR - 12, W, 12, '#2a4f55', INK, 2);
  const fl = g.createLinearGradient(0, FLOOR, 0, H);
  fl.addColorStop(0, '#8a6e52'); fl.addColorStop(1, '#5e4a38');
  g.fillStyle = fl; g.fillRect(0, FLOOR, W, H - FLOOR);
  for (let row = 0; row < 9; row++) {
    const y0 = FLOOR + Math.pow(row / 9, 1.2) * (H - FLOOR), y1 = FLOOR + Math.pow((row + 1) / 9, 1.2) * (H - FLOOR);
    for (let col = -2; col < 24; col++) if ((row + col) % 2) { g.fillStyle = 'rgba(233,228,214,0.16)'; g.fillRect(col * 48 + (col - 10) * (y0 - FLOOR) * 0.05, y0, 48 + (y0 - FLOOR) * 0.05, y1 - y0); }
  }
  speckle(g, r, 0, FLOOR, W, H - FLOOR, 1800, ['#000', '#a08a70'], 0.25, 2);
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, FLOOR, W, 10);
  // Tapete
  g.fillStyle = '#8e1f27'; g.beginPath(); g.ellipse(760, 600, 170, 38, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = PAL.amber2; g.lineWidth = 3; g.beginPath(); g.ellipse(760, 600, 150, 30, 0, 0, Math.PI * 2); g.stroke();
  // Teto e vinheta
  g.fillStyle = '#1f2a2c'; g.fillRect(0, 0, W, 26);
  halftone(g, 0, 26, W, 30, 6, 1.3, '#000', 0.28);
  const v = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // Lâmpada
  for (const L of CASA.lamps) {
    g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.moveTo(L.x, 26); g.lineTo(L.x, L.headY); g.stroke();
    poly(g, [L.x - 20, L.headY, L.x + 20, L.headY, L.x + 10, L.headY - 14, L.x - 10, L.headY - 14], '#c8a24a', INK, 2);
  }
  return { canvas: c, window: win };
}

export function paintCasaProps(): Record<string, HTMLCanvasElement> {
  const t: Record<string, HTMLCanvasElement> = {};
  { // geladeira antiga com ímãs
    const { c, g } = makeCanvas(96, 190);
    rect(g, 6, 4, 84, 184, '#d9d3c2', INK, 3);
    g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(6, 64); g.lineTo(90, 64); g.stroke();
    rect(g, 76, 20, 6, 30, '#8a8f8c', INK, 1.5); rect(g, 76, 80, 6, 50, '#8a8f8c', INK, 1.5);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(6, 4, 18, 184);
    for (const [x, y, col] of [[30, 90, PAL.red2], [48, 110, PAL.amber2], [36, 130, '#2a8a8a']] as const) rect(g, x, y, 12, 10, col, INK, 1.2);
    rect(g, 28, 140, 36, 26, '#e9e4d6', INK, 1.2);
    t.geladeira = c;
  }
  { // mesa da cozinha com toalha, cadeiras e apostilas
    const { c, g } = makeCanvas(240, 120);
    const chair = (x: number, flip: boolean) => { rect(g, x, 56, 30, 8, '#6b4e35', INK, 2); rect(g, flip ? x + 24 : x, 18, 6, 40, '#6b4e35', INK, 2); g.strokeStyle = INK; g.lineWidth = 3.5; g.beginPath(); g.moveTo(x + 4, 64); g.lineTo(x + 4, 116); g.moveTo(x + 26, 64); g.lineTo(x + 26, 116); g.stroke(); };
    chair(4, false); chair(206, true);
    poly(g, [36, 46, 204, 46, 214, 70, 26, 70], '#e9e4d6', INK, 2.5);
    g.strokeStyle = PAL.red2; g.lineWidth = 2; for (let x = 40; x < 210; x += 14) { g.beginPath(); g.moveTo(x, 47); g.lineTo(x - 4, 69); g.stroke(); }
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(48, 70); g.lineTo(46, 118); g.moveTo(192, 70); g.lineTo(194, 118); g.stroke();
    rect(g, 70, 36, 40, 10, '#2a6672', INK, 1.5); rect(g, 76, 28, 34, 8, '#e8c65a', INK, 1.5); rect(g, 140, 32, 14, 14, '#3a2418', INK, 1.5);
    t.mesa_cozinha = c;
  }
  { // sofá gasto
    const { c, g } = makeCanvas(240, 130);
    rect(g, 10, 18, 220, 62, '#7a2f3a', INK, 3);
    rect(g, 4, 50, 232, 50, '#8e3a45', INK, 3);
    rect(g, 0, 40, 34, 72, '#6e2832', INK, 3); rect(g, 206, 40, 34, 72, '#6e2832', INK, 3);
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(120, 54); g.lineTo(120, 98); g.stroke();
    halftone(g, 10, 60, 220, 40, 5, 1.1, '#000', 0.25);
    rect(g, 150, 34, 40, 26, PAL.amber2, INK, 2);
    for (const x of [16, 216]) rect(g, x, 112, 10, 16, '#2a1a10', INK, 1.5);
    t.sofa = c;
  }
  { // pichação "DEVE" no portão (consequência)
    const { c, g } = makeCanvas(120, 60);
    g.save(); g.translate(60, 30); g.rotate(-0.08);
    g.font = '900 38px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 3; g.strokeStyle = '#4a0d12'; g.strokeText('DEVE', 0, 0);
    g.fillStyle = PAL.red2; g.fillText('DEVE', 0, 0);
    g.fillStyle = PAL.red2; for (const x of [-30, -6, 20]) g.fillRect(x, 14, 3, 12 + Math.abs(x) % 9);
    g.restore();
    t.pichacao_deve = c;
  }
  return t;
}
