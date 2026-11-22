/**
 * Busca de caminho (A*) em grade sobre a área caminhável, usada no "tocar para ir".
 * Obstáculos = colisores do layout inflados pelo tamanho da pegada do personagem.
 * Puro e determinístico (testado em tests/path.test.ts). Custo: ~4 mil células na Vila.
 */
import type { AreaLayout, Box } from './layout';

export interface Pt { x: number; y: number }
const CELL = 16;
// Pegada dos pés: 26×14 px, com a posição do personagem na BASE (os pés sobem 14 px a partir dela).
// Por isso a folga é assimétrica: um obstáculo bloqueia do seu topo (−3) até a base + 14 px dos pés + 5 de folga.
// (Antes era ±4,5 px: a rota passava rente por baixo da moto e o corpo físico esbarrava nela.)
const PAD_X = 16, PAD_TOP = 3, PAD_BOTTOM = 19;

export function obstacles(layout: AreaLayout, extra: Box[] = [], includePatrol = false): Box[] {
  const boxes = [...layout.colliders, ...layout.props.filter(p => p.collider && (includePatrol || p.when !== 'patrol')).map(p => p.collider!), ...extra];
  return boxes.map(b => ({ x: b.x - PAD_X, y: b.y - PAD_TOP, w: b.w + PAD_X * 2, h: b.h + PAD_TOP + PAD_BOTTOM }));
}

const inside = (boxes: Box[], x: number, y: number) => boxes.some(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);

function lineFree(boxes: Box[], a: Pt, b: Pt): boolean {
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / 6));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (inside(boxes, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
  }
  return true;
}

export function findPath(layout: AreaLayout, from: Pt, to: Pt, boxes = obstacles(layout)): Pt[] | null {
  const W = layout.walk;
  const cols = Math.ceil((W.right - W.left) / CELL), rows = Math.ceil((W.bottom - W.top) / CELL);
  const cx = (i: number) => W.left + (i + 0.5) * CELL, cy = (j: number) => W.top + (j + 0.5) * CELL;
  const blocked = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) blocked[j * cols + i] = inside(boxes, cx(i), cy(j)) ? 1 : 0;
  const cell = (p: Pt) => ({ i: Math.min(cols - 1, Math.max(0, Math.floor((p.x - W.left) / CELL))), j: Math.min(rows - 1, Math.max(0, Math.floor((p.y - W.top) / CELL))) });
  // Destino bloqueado: usa a célula livre mais próxima.
  const nearestFree = (c: { i: number; j: number }) => {
    if (!blocked[c.j * cols + c.i]) return c;
    let best: { i: number; j: number } | null = null, bd = Infinity;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (blocked[j * cols + i]) continue;
      const d = (i - c.i) ** 2 + ((j - c.j) * 1.4) ** 2;
      if (d < bd) { bd = d; best = { i, j }; }
    }
    return best;
  };
  const s = nearestFree(cell(from)), g = nearestFree(cell(to));
  if (!s || !g) return null;
  const goalPt: Pt = blocked[cell(to).j * cols + cell(to).i] ? { x: cx(g.i), y: cy(g.j) } : to;
  if (lineFree(boxes, from, goalPt)) return [goalPt];
  const N = cols * rows, start = s.j * cols + s.i, goal = g.j * cols + g.i;
  const gScore = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const open: number[] = [start];
  const f = new Float32Array(N).fill(Infinity);
  const h = (k: number) => Math.hypot((k % cols) - g.i, Math.floor(k / cols) - g.j);
  gScore[start] = 0; f[start] = h(start);
  while (open.length) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]!]! < f[open[bi]!]!) bi = k;
    const cur = open.splice(bi, 1)[0]!;
    if (cur === goal) break;
    closed[cur] = 1;
    const ci = cur % cols, cj = Math.floor(cur / cols);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const nk = nj * cols + ni;
      if (blocked[nk] || closed[nk]) continue;
      if (di && dj && (blocked[cj * cols + ni] || blocked[nj * cols + ci])) continue; // sem cortar quina
      const ng = gScore[cur]! + (di && dj ? Math.SQRT2 : 1);
      if (ng < gScore[nk]!) {
        gScore[nk] = ng; came[nk] = cur; f[nk] = ng + h(nk);
        if (!open.includes(nk)) open.push(nk);
      }
    }
  }
  if (came[goal] === -1 && goal !== start) return null;
  const cells: Pt[] = [];
  for (let k = goal; k !== -1 && k !== start; k = came[k]!) cells.push({ x: cx(k % cols), y: cy(Math.floor(k / cols)) });
  cells.reverse();
  cells[cells.length - 1] = goalPt;
  // Suavização por linha de visada.
  const out: Pt[] = [];
  let anchor = from, idx = 0;
  while (idx < cells.length) {
    let far = idx;
    for (let k = cells.length - 1; k > idx; k--) if (lineFree(boxes, anchor, cells[k]!)) { far = k; break; }
    out.push(cells[far]!);
    anchor = cells[far]!;
    idx = far + 1;
  }
  return out;
}
