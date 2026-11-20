/**
 * Utilitários de pintura procedural (Canvas 2D) para o estilo graphic novel:
 * contorno grosso, sombras duras, retícula (halftone), manchas de concreto.
 * Toda a arte do jogo é gerada aqui, em tempo de carregamento — nenhuma imagem externa.
 */

export const INK = '#07090c';
export const PAL = {
  ink: INK,
  night: '#0a1419',
  petrol0: '#0c2229', petrol1: '#123640', petrol2: '#1b4b56', petrol3: '#2a6672', petrol4: '#3f8592',
  concrete0: '#3a4446', concrete1: '#4f5b5c', concrete2: '#66716f', concrete3: '#838b85', concrete4: '#a39d8c',
  amber0: '#9a5a14', amber1: '#d98b25', amber2: '#f2a541', amber3: '#ffc56b', amber4: '#ffe3a6',
  red0: '#5e1219', red1: '#8e1f27', red2: '#c8323c', red3: '#e8545a',
  brick0: '#4b2a20', brick1: '#6e3a2a', brick2: '#8a4a35', brick3: '#a8634a',
  asphalt0: '#12191c', asphalt1: '#1a2428', asphalt2: '#243034',
  paper: '#d9cfb8', white: '#e9e4d6'
};

/** PRNG determinístico (mulberry32) — a arte é idêntica a cada carregamento. */
export function rng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + next() * (max - min),
    int: (min: number, max: number) => Math.floor(min + next() * (max - min + 1)),
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(next() * arr.length)]!,
    chance: (p: number) => next() < p
  };
}
export type R = ReturnType<typeof rng>;

export function makeCanvas(w: number, h: number): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d')!;
  return { c, g };
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
  if (f < 1) { r *= f; gg *= f; b *= f; } else { r += (255 - r) * (f - 1); gg += (255 - gg) * (f - 1); b += (255 - b) * (f - 1); }
  return `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`;
}
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number, sh: number) => (s >> sh) & 255;
  const r = Math.round(ch(pa, 16) + (ch(pb, 16) - ch(pa, 16)) * t);
  const gg = Math.round(ch(pa, 8) + (ch(pb, 8) - ch(pa, 8)) * t);
  const bb = Math.round(ch(pa, 0) + (ch(pb, 0) - ch(pa, 0)) * t);
  return '#' + ((1 << 24) + (r << 16) + (gg << 8) + bb).toString(16).slice(1);
}

export function rect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string | null = INK, lw = 3) {
  g.fillStyle = fill; g.fillRect(x, y, w, h);
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeRect(x, y, w, h); }
}

export function poly(g: CanvasRenderingContext2D, pts: number[], fill: string | null, stroke: string | null = INK, lw = 3) {
  g.beginPath();
  g.moveTo(pts[0]!, pts[1]!);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!);
  g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); }
}

/** Salpicos de textura (concreto, ferrugem, sujeira). */
export function speckle(g: CanvasRenderingContext2D, r: R, x: number, y: number, w: number, h: number, count: number, colors: string[], alpha = 0.35, size = 2) {
  g.save();
  g.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    g.fillStyle = r.pick(colors);
    const s = r.range(size * 0.4, size * 1.4);
    g.fillRect(x + r.next() * w, y + r.next() * h, s, s * r.range(0.6, 1.4));
  }
  g.restore();
}

/** Manchas verticais de infiltração escorrendo do topo de um muro. */
export function stains(g: CanvasRenderingContext2D, r: R, x: number, y: number, w: number, h: number, count: number, color = '#000', alpha = 0.22) {
  g.save();
  for (let i = 0; i < count; i++) {
    const sx = x + r.next() * w, sw = r.range(4, 22), sh = r.range(h * 0.15, h * 0.7);
    const grad = g.createLinearGradient(0, y, 0, y + sh);
    grad.addColorStop(0, color); grad.addColorStop(1, 'transparent');
    g.globalAlpha = alpha * r.range(0.4, 1);
    g.fillStyle = grad;
    g.fillRect(sx, y, sw, sh);
  }
  g.restore();
}

/** Retícula de pontos (halftone) — assinatura gráfica do estilo HQ. Desenha dentro de um clip já definido. */
export function halftone(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, step: number, rad: number, color: string, alpha = 0.35, angle = 0.4) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  const ca = Math.cos(angle), sa = Math.sin(angle);
  const span = Math.max(w, h) * 1.5;
  const cx = x + w / 2, cy = y + h / 2;
  for (let i = -span; i < span; i += step) {
    for (let j = -span; j < span; j += step) {
      const px = cx + i * ca - j * sa, py = cy + i * sa + j * ca;
      if (px < x - rad || px > x + w + rad || py < y - rad || py > y + h + rad) continue;
      g.beginPath(); g.arc(px, py, rad, 0, Math.PI * 2); g.fill();
    }
  }
  g.restore();
}

/** Sombra dura projetada em diagonal (estilo HQ) clipada a um retângulo. */
export function hardShadow(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, depth: number, color = 'rgba(4,10,14,0.45)') {
  g.save();
  g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y); g.lineTo(x + w, y); g.lineTo(x + w, y + depth * 0.25); g.lineTo(x, y + depth); g.closePath();
  g.fill();
  g.restore();
}

/** Brilho radial (usado para gerar texturas de luz aditiva). */
export function glowTexture(size: number, color: string, inner = 0.0, falloff = 1): HTMLCanvasElement {
  const { c, g } = makeCanvas(size, size);
  const grad = g.createRadialGradient(size / 2, size / 2, size * inner * 0.5, size / 2, size / 2, size / 2);
  grad.addColorStop(0, color);
  grad.addColorStop(Math.min(0.95, 0.35 * falloff), color.replace(/[\d.]+\)$/, m => String(Number(m.slice(0, -1)) * 0.45) + ')'));
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Texto pintado em placa (letreiros fictícios, sem marcas reais). */
export function signText(g: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string, font = 'Impact, "Arial Black", "Helvetica Neue", sans-serif', align: CanvasTextAlign = 'center', weight = '900') {
  g.save();
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = align;
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(2, size * 0.14);
  g.strokeStyle = INK;
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
  g.restore();
}

/** Linha "à mão" levemente tremida para fios e rachaduras. */
export function wobbleLine(g: CanvasRenderingContext2D, r: R, x1: number, y1: number, x2: number, y2: number, jitter: number, segs = 8) {
  g.beginPath(); g.moveTo(x1, y1);
  for (let i = 1; i <= segs; i++) {
    const t = i / segs;
    g.lineTo(x1 + (x2 - x1) * t + (i < segs ? r.range(-jitter, jitter) : 0), y1 + (y2 - y1) * t + (i < segs ? r.range(-jitter, jitter) : 0));
  }
  g.stroke();
}
