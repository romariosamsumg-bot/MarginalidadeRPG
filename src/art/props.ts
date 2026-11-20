/**
 * Objetos de cena e texturas de efeito. Origem de cada objeto: centro da base (0.5, 1).
 */
import { BUSINESSES } from '../core/legacy/data';
import { INK, PAL, glowTexture, halftone, makeCanvas, poly, rect, rng, shade, signText, speckle } from './paint';

export type Tex = Record<string, HTMLCanvasElement>;

function wheel(g: CanvasRenderingContext2D, x: number, y: number, rr: number) {
  g.fillStyle = '#0b0d0e'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#6d7471'; g.beginPath(); g.arc(x, y, rr * 0.45, 0, Math.PI * 2); g.fill(); g.stroke();
}

export function paintProps(): Tex {
  const t: Tex = {};
  const r = rng(77);

  { // poste de concreto com luminária
    const { c, g } = makeCanvas(90, 390);
    rect(g, 38, 20, 14, 370, '#69716d', INK, 3);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(38, 20, 5, 370);
    for (let y = 60; y < 380; y += 40) { g.fillStyle = '#4c5452'; g.fillRect(40, y, 10, 3); }
    poly(g, [45, 26, 82, 18, 84, 26, 48, 34], '#4e5654', INK, 2.5);
    poly(g, [64, 22, 88, 18, 86, 30, 66, 32], '#2a2f30', INK, 2.5);
    g.fillStyle = '#ffe2a0'; g.fillRect(68, 29, 16, 4);
    rect(g, 32, 368, 26, 22, '#565d5b', INK, 2.5);
    signText(g, '', 0, 0, 1, '#000');
    t.poste = c;
  }
  { // moto
    const { c, g } = makeCanvas(130, 80);
    wheel(g, 26, 58, 18); wheel(g, 104, 58, 18);
    poly(g, [26, 58, 52, 34, 92, 30, 104, 58, 84, 58, 70, 44, 46, 46], PAL.red1, INK, 3);
    poly(g, [50, 34, 82, 28, 86, 36, 52, 40], '#141617', INK, 2);
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(96, 34); g.lineTo(104, 12); g.lineTo(116, 10); g.stroke();
    g.fillStyle = PAL.amber3; g.beginPath(); g.arc(110, 22, 4, 0, Math.PI * 2); g.fill();
    t.moto = c;
  }
  { // pilha de pneus
    const { c, g } = makeCanvas(60, 70);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#121414'; g.beginPath(); g.ellipse(30, 58 - i * 14, 26, 9, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke(); g.strokeStyle = '#2e3333'; g.lineWidth = 2; g.beginPath(); g.ellipse(30, 56 - i * 14, 12, 4, 0, 0, Math.PI * 2); g.stroke(); }
    t.pneus = c;
  }
  { // mural de recados (missões)
    const { c, g } = makeCanvas(110, 120);
    rect(g, 50, 70, 8, 50, '#3a2a1e', INK, 2);
    rect(g, 6, 8, 98, 70, '#6b4a2e', INK, 3);
    rect(g, 12, 14, 86, 58, '#a88a5f', INK, 2);
    const cols = ['#e9e4d6', '#f2c56b', '#e8545a', '#cfe0dd'];
    for (let i = 0; i < 7; i++) { g.save(); g.translate(20 + (i % 4) * 20, 22 + Math.floor(i / 4) * 24); g.rotate(r.range(-0.2, 0.2)); rect(g, 0, 0, 16, 18, cols[i % 4]!, INK, 1.2); g.fillStyle = '#333'; for (let l = 0; l < 3; l++) g.fillRect(3, 5 + l * 4, 10, 1.2); g.restore(); }
    g.fillStyle = PAL.red2; g.beginPath(); g.arc(90, 22, 3, 0, Math.PI * 2); g.fill();
    t.mural = c;
  }
  { // banco de praça
    const { c, g } = makeCanvas(110, 50);
    rect(g, 8, 18, 94, 8, '#7a5a3a', INK, 2.5); rect(g, 8, 4, 94, 8, '#7a5a3a', INK, 2.5);
    rect(g, 14, 26, 6, 24, '#2c3132', INK, 2); rect(g, 90, 26, 6, 24, '#2c3132', INK, 2);
    t.banco = c;
  }
  { // árvore (copa sobre a cabeça dos personagens)
    const { c, g } = makeCanvas(220, 340);
    poly(g, [100, 340, 104, 180, 92, 140, 108, 150, 116, 120, 120, 180, 122, 340], '#3b2a20', INK, 3);
    const blobs: Array<[number, number, number]> = [[110, 90, 62], [60, 110, 46], [160, 110, 48], [80, 60, 44], [140, 56, 46], [110, 34, 40], [40, 140, 30], [180, 150, 30]];
    for (const [x, y, rr] of blobs) { g.fillStyle = '#163d2c'; g.beginPath(); g.arc(x, y, rr + 3, 0, Math.PI * 2); g.fill(); }
    for (const [x, y, rr] of blobs) { g.fillStyle = '#21543a'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill(); }
    g.save(); g.beginPath(); for (const [x, y, rr] of blobs) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, Math.PI * 2); } g.clip();
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 90, 220, 120);
    halftone(g, 0, 0, 220, 200, 6, 1.4, '#000', 0.3);
    g.fillStyle = 'rgba(255,200,110,0.22)'; g.beginPath(); g.arc(150, 50, 40, 0, Math.PI * 2); g.fill();
    g.restore();
    g.strokeStyle = INK; g.lineWidth = 3;
    for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#21543a'; for (const [x, y, rr] of blobs) { g.beginPath(); g.arc(x, y, rr - 2, 0, Math.PI * 2); g.fill(); }
    g.save(); g.beginPath(); for (const [x, y, rr] of blobs) { g.moveTo(x + rr, y); g.arc(x, y, rr - 2, 0, Math.PI * 2); } g.clip();
    g.fillStyle = 'rgba(0,0,0,0.32)'; g.fillRect(0, 100, 220, 120); halftone(g, 0, 0, 220, 200, 6, 1.3, '#000', 0.28);
    g.fillStyle = 'rgba(255,200,110,0.18)'; g.beginPath(); g.arc(150, 50, 40, 0, Math.PI * 2); g.fill();
    g.restore();
    t.arvore = c;
  }
  { // mesa de plástico com cadeiras
    const { c, g } = makeCanvas(130, 80);
    const chair = (x: number, flip: number) => { rect(g, x, 30, 20, 6, '#e6e1d2', INK, 2); poly(g, [x + (flip > 0 ? 0 : 16), 30, x + (flip > 0 ? 4 : 20), 6, x + (flip > 0 ? 8 : 12), 6, x + (flip > 0 ? 6 : 14), 30], '#e6e1d2', INK, 2); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 2, 36); g.lineTo(x, 70); g.moveTo(x + 18, 36); g.lineTo(x + 20, 70); g.stroke(); };
    chair(4, 1); chair(106, -1);
    rect(g, 34, 26, 62, 7, '#e8e3d4', INK, 2.5);
    g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 33); g.lineTo(36, 78); g.moveTo(90, 33); g.lineTo(94, 78); g.stroke();
    g.strokeStyle = '#e8e3d4'; g.lineWidth = 2; g.stroke();
    rect(g, 50, 12, 9, 14, '#6a3a1a', INK, 1.5); rect(g, 70, 16, 7, 10, 'rgba(220,240,240,0.7)', INK, 1.2);
    t.mesa = c;
  }
  { // engradados
    const { c, g } = makeCanvas(56, 56);
    for (let i = 0; i < 2; i++) { rect(g, 4 + i * 4, 30 - i * 26, 46, 24, i ? PAL.red1 : '#c8a24a', INK, 2.5); g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 2; for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(4 + i * 4 + k * 11.5, 30 - i * 26); g.lineTo(4 + i * 4 + k * 11.5, 54 - i * 26); g.stroke(); } }
    t.engradados = c;
  }
  { // caixotes de frutas
    const { c, g } = makeCanvas(96, 50);
    for (let i = 0; i < 3; i++) {
      rect(g, 4 + i * 30, 18, 28, 30, '#8a6a3e', INK, 2);
      const fc = ['#e8545a', '#f2b25a', '#7ab04a'][i]!;
      for (let k = 0; k < 6; k++) { g.fillStyle = fc; g.beginPath(); g.arc(10 + i * 30 + (k % 3) * 8, 16 - Math.floor(k / 3) * 6, 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); }
    }
    t.caixotes = c;
  }
  { // abrigo do ponto de ônibus
    const { c, g } = makeCanvas(200, 200);
    rect(g, 20, 40, 8, 160, '#3c4446', INK, 2.5); rect(g, 172, 40, 8, 160, '#3c4446', INK, 2.5);
    poly(g, [6, 40, 194, 30, 194, 44, 6, 52], '#245a3a', INK, 3);
    rect(g, 40, 60, 120, 80, 'rgba(160,210,220,0.18)', INK, 2.5);
    rect(g, 52, 70, 50, 60, '#d9cfb8', INK, 1.5);
    g.fillStyle = INK; g.font = '800 9px Arial, sans-serif'; g.textAlign = 'center';
    g.fillText('LINHA 314', 77, 84); g.fillText('VILA DO DIQUE', 77, 98); g.fillText('↔ CENTRO', 77, 112);
    rect(g, 40, 150, 120, 8, '#6a7270', INK, 2); rect(g, 50, 158, 6, 42, '#3c4446', INK, 1.5); rect(g, 144, 158, 6, 42, '#3c4446', INK, 1.5);
    rect(g, 178, 6, 18, 40, PAL.amber2, INK, 2); signText(g, 'P', 187, 26, 18, INK);
    t.abrigo = c;
  }
  const car = (body: string, patrol: boolean) => {
    const { c, g } = makeCanvas(250, 110);
    poly(g, [8, 84, 10, 58, 40, 52, 70, 24, 160, 22, 196, 50, 238, 56, 244, 84], body, INK, 3.5);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(10, 70, 234, 14);
    poly(g, [78, 30, 112, 28, 112, 50, 60, 52], '#16303a', INK, 2.5);
    poly(g, [120, 28, 156, 28, 184, 50, 120, 50], '#16303a', INK, 2.5);
    g.fillStyle = 'rgba(160,220,230,0.25)'; g.beginPath(); g.moveTo(90, 30); g.lineTo(100, 30); g.lineTo(80, 50); g.lineTo(70, 50); g.fill();
    wheel(g, 60, 84, 20); wheel(g, 196, 84, 20);
    rect(g, 236, 58, 8, 8, PAL.amber3, INK, 1.5); rect(g, 8, 60, 8, 8, PAL.red2, INK, 1.5);
    if (patrol) {
      rect(g, 100, 12, 50, 10, '#1a1a1a', INK, 2); g.fillStyle = '#2a5bd8'; g.fillRect(102, 14, 22, 6); g.fillStyle = PAL.red2; g.fillRect(126, 14, 22, 6);
      rect(g, 70, 56, 120, 14, '#e9e4d6', INK, 1.5); signText(g, 'PATRULHA', 130, 63, 11, '#1b3a5a', 'Arial, sans-serif');
    }
    speckle(g, rng(patrol ? 3 : 4), 10, 30, 230, 50, 120, ['#000'], 0.15, 2);
    return c;
  };
  t.carro = car('#4f6d5a', false);
  t.viatura = car('#2b3b4f', true);
  { // lixeira
    const { c, g } = makeCanvas(44, 64);
    poly(g, [6, 14, 38, 14, 34, 62, 10, 62], '#2a6672', INK, 2.5);
    rect(g, 3, 8, 38, 8, '#1b4b56', INK, 2.5);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(10, 16, 7, 46);
    t.lixeira = c;
  }
  // roupas no varal
  const cloth = (col: string, kind: number) => {
    const { c, g } = makeCanvas(40, 48);
    if (kind === 0) poly(g, [4, 4, 36, 4, 36, 14, 30, 14, 30, 44, 10, 44, 10, 14, 4, 14], col, INK, 2);
    else if (kind === 1) poly(g, [6, 4, 34, 4, 32, 40, 22, 40, 20, 18, 18, 40, 8, 40], col, INK, 2);
    else poly(g, [4, 4, 36, 4, 34, 30, 6, 30], col, INK, 2);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(4, 4, 10, 40);
    g.fillStyle = '#ddd'; g.fillRect(12, 1, 3, 6); g.fillRect(26, 1, 3, 6);
    return c;
  };
  t.roupa0 = cloth(PAL.red2, 0); t.roupa1 = cloth('#2a4f6e', 1); t.roupa2 = cloth('#e9e4d6', 2); t.roupa3 = cloth(PAL.amber2, 0);
  // neon BAR (aceso/apagado)
  const neon = (on: boolean) => {
    const { c, g } = makeCanvas(96, 56);
    rect(g, 4, 4, 88, 48, '#0d1214', INK, 3);
    g.save();
    if (on) { g.shadowColor = '#ff5a5f'; g.shadowBlur = 12; }
    signText(g, 'BAR', 48, 29, 30, on ? '#ff7a7f' : '#4a2224', 'Georgia, serif');
    g.restore();
    return c;
  };
  t.neon_on = neon(true); t.neon_off = neon(false);
  // porta de aço fechada da oficina
  {
    const { c, g } = makeCanvas(380, 166);
    rect(g, 0, 0, 380, 166, '#68736f', INK, 3);
    g.strokeStyle = '#46504d'; g.lineWidth = 2; for (let y = 6; y < 166; y += 8) { g.beginPath(); g.moveTo(2, y); g.lineTo(378, y); g.stroke(); }
    speckle(g, r, 0, 0, 380, 166, 900, ['#3a2a1e', '#000', '#8a8a80'], 0.35, 2);
    rect(g, 150, 60, 80, 46, '#efe9da', INK, 1.5);
    g.fillStyle = INK; g.font = '800 10px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('FECHADO ATÉ', 190, 78); g.fillText('SEGUNDA ORDEM', 190, 92);
    rect(g, 176, 154, 28, 8, '#2a2f30', INK, 1.5);
    t.oficina_fechada = c;
  }
  // placas de negócio (ponto comercial ocupado)
  for (const b of BUSINESSES) {
    const { c, g } = makeCanvas(200, 40);
    rect(g, 2, 2, 196, 36, PAL.petrol1, INK, 3);
    signText(g, b.name.toUpperCase(), 100, 21, b.name.length > 14 ? 15 : 18, PAL.amber3);
    t[`placa_${b.id}`] = c;
  }
  { // bandeirinhas de festa
    const { c, g } = makeCanvas(900, 90);
    const colors = [PAL.red2, PAL.amber2, '#2a8a8a', '#e9e4d6', '#5a8a3a'];
    for (let line = 0; line < 2; line++) {
      g.strokeStyle = '#111'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 10 + line * 30); g.quadraticCurveTo(450, 46 + line * 30, 900, 10 + line * 30); g.stroke();
      for (let x = 10; x < 890; x += 22) { const tt = x / 900; const y = (1 - tt) * (1 - tt) * (10 + line * 30) + 2 * (1 - tt) * tt * (46 + line * 30) + tt * tt * (10 + line * 30); poly(g, [x, y, x + 14, y, x + 7, y + 16], colors[(x / 22 + line) % colors.length | 0]!, INK, 1); }
    }
    t.bandeirinhas = c;
  }
  // Bar — interior
  {
    const { c, g } = makeCanvas(560, 110);
    rect(g, 6, 20, 548, 90, '#5a3a24', INK, 3);
    rect(g, 0, 8, 560, 16, '#7a5232', INK, 3);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(6, 24, 548, 12);
    for (let x = 40; x < 540; x += 80) { g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 36); g.lineTo(x, 108); g.stroke(); }
    halftone(g, 6, 36, 548, 74, 6, 1.2, '#000', 0.22);
    for (let i = 0; i < 4; i++) rect(g, 60 + i * 130, 0, 10 + (i % 2) * 4, 10, i % 2 ? 'rgba(200,230,230,0.7)' : '#6a3a1a', INK, 1.5);
    t.balcao = c;
  }
  {
    const { c, g } = makeCanvas(320, 60);
    for (let i = 0; i < 6; i++) { const x = 20 + i * 52; rect(g, x, 8, 30, 8, PAL.red1, INK, 2); g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 15, 16); g.lineTo(x + 15, 56); g.moveTo(x + 4, 56); g.lineTo(x + 26, 56); g.stroke(); g.strokeStyle = '#8a8f8c'; g.lineWidth = 2; g.stroke(); }
    t.banquetas = c;
  }
  {
    const { c, g } = makeCanvas(160, 90);
    const chair = (x: number) => { rect(g, x, 40, 22, 6, '#2a6672', INK, 2); rect(g, x + (x < 80 ? 0 : 16), 12, 6, 30, '#2a6672', INK, 2); g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 3, 46); g.lineTo(x + 3, 86); g.moveTo(x + 19, 46); g.lineTo(x + 19, 86); g.stroke(); };
    chair(4); chair(134);
    rect(g, 32, 34, 96, 9, '#8a5a3a', INK, 2.5);
    g.strokeStyle = INK; g.lineWidth = 5; g.beginPath(); g.moveTo(80, 43); g.lineTo(80, 86); g.moveTo(60, 88); g.lineTo(100, 88); g.stroke();
    rect(g, 60, 20, 8, 14, '#6a3a1a', INK, 1.5); rect(g, 86, 24, 10, 10, 'rgba(255,220,150,0.8)', INK, 1.2);
    t.mesa_bar = c;
  }
  {
    const { c, g } = makeCanvas(70, 130);
    rect(g, 6, 20, 58, 108, '#3a1a20', INK, 3);
    g.fillStyle = PAL.amber2; g.beginPath(); g.arc(35, 30, 26, Math.PI, 0); g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
    rect(g, 14, 50, 42, 30, '#ffd48a', INK, 2);
    for (let i = 0; i < 4; i++) rect(g, 16 + i * 10, 90, 7, 7, [PAL.red2, '#2a8a8a', PAL.amber3, '#e9e4d6'][i]!, INK, 1);
    t.jukebox = c;
  }
  // ventilador de teto (4 quadros)
  for (let f = 0; f < 4; f++) {
    const { c, g } = makeCanvas(160, 40);
    rect(g, 77, 0, 6, 18, '#2a2f30', INK, 1.5);
    const a = f * Math.PI / 8;
    for (let k = 0; k < 4; k++) {
      const ang = a + k * Math.PI / 2, len = Math.cos(ang) * 70, dep = Math.sin(ang) * 8;
      poly(g, [80, 20, 80 + len, 20 + dep - 4, 80 + len, 20 + dep + 4], '#4a3a2a', INK, 1.5);
    }
    rect(g, 72, 16, 16, 10, '#2a2f30', INK, 1.5);
    t[`ventilador${f}`] = c;
  }

  // Efeitos de luz e auxiliares
  t.glow = glowTexture(128, 'rgba(255,190,100,0.9)');
  t.glowWarm = glowTexture(128, 'rgba(255,160,70,0.8)', 0, 1.6);
  t.glowRed = glowTexture(64, 'rgba(255,60,60,1)');
  t.glowBlue = glowTexture(64, 'rgba(80,140,255,1)');
  t.glowCool = glowTexture(128, 'rgba(120,200,255,0.8)');
  { // cone de luz do poste
    const { c, g } = makeCanvas(260, 380);
    const gr = g.createLinearGradient(0, 0, 0, 380);
    gr.addColorStop(0, 'rgba(255,200,120,0.55)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(118, 0); g.lineTo(142, 0); g.lineTo(260, 380); g.lineTo(0, 380); g.closePath(); g.fill();
    t.cone = c;
  }
  { // poça de luz no chão
    const { c, g } = makeCanvas(256, 80);
    const gr = g.createRadialGradient(128, 40, 4, 128, 40, 128);
    gr.addColorStop(0, 'rgba(255,190,100,0.55)'); gr.addColorStop(1, 'rgba(255,170,80,0)');
    g.save(); g.scale(1, 80 / 256 * 1.0); g.restore();
    g.fillStyle = gr; g.beginPath(); g.ellipse(128, 40, 128, 40, 0, 0, Math.PI * 2); g.fill();
    t.pool = c;
  }
  { const { c, g } = makeCanvas(64, 20); g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(32, 10, 30, 8, 0, 0, Math.PI * 2); g.fill(); t.sombra = c; }
  { const { c, g } = makeCanvas(4, 4); g.fillStyle = '#fff'; g.fillRect(0, 0, 4, 4); t.pixel = c; }
  { const { c, g } = makeCanvas(3, 22); const gr = g.createLinearGradient(0, 0, 0, 22); gr.addColorStop(0, 'rgba(180,210,220,0)'); gr.addColorStop(1, 'rgba(200,225,235,0.7)'); g.fillStyle = gr; g.fillRect(0, 0, 2, 22); t.chuva = c; }
  { const { c, g } = makeCanvas(48, 48); const gr = g.createRadialGradient(24, 24, 2, 24, 24, 24); gr.addColorStop(0, 'rgba(200,210,205,0.35)'); gr.addColorStop(1, 'rgba(200,210,205,0)'); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); t.fumaca = c; }
  { const { c, g } = makeCanvas(6, 6); g.fillStyle = 'rgba(255,230,180,0.9)'; g.beginPath(); g.arc(3, 3, 2, 0, Math.PI * 2); g.fill(); t.mariposa = c; }
  { // marcador de interação: losango âmbar
    const { c, g } = makeCanvas(36, 44);
    poly(g, [18, 2, 32, 16, 18, 30, 4, 16], PAL.amber2, INK, 3);
    poly(g, [18, 9, 25, 16, 18, 23, 11, 16], PAL.amber4, null);
    poly(g, [12, 34, 24, 34, 18, 42], PAL.amber2, INK, 2);
    t.marcador = c;
  }
  { // anel no chão do alvo
    const { c, g } = makeCanvas(120, 40);
    g.strokeStyle = 'rgba(242,165,65,0.85)'; g.lineWidth = 3; g.beginPath(); g.ellipse(60, 20, 54, 15, 0, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(60, 20, 50, 12, 0, 0, Math.PI * 2); g.stroke();
    t.anel = c;
  }
  { // seta de objetivo fora da tela
    const { c, g } = makeCanvas(40, 40);
    poly(g, [36, 20, 8, 4, 14, 20, 8, 36], PAL.amber2, INK, 3);
    t.seta = c;
  }
  { // balão "..." de conversa
    const { c, g } = makeCanvas(44, 30);
    g.fillStyle = PAL.white; g.beginPath(); g.roundRect(2, 2, 40, 20, 8); g.fill(); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    poly(g, [12, 21, 20, 21, 10, 29], PAL.white, INK, 2);
    g.fillStyle = INK; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(13 + i * 9, 12, 2.4, 0, Math.PI * 2); g.fill(); }
    t.balao = c;
  }
  void shade;
  return t;
}
