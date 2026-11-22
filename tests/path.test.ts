import { describe, expect, it } from 'vitest';
import { findPath, obstacles } from '../src/world/path';
import { BAR, VILA, type AreaLayout } from '../src/world/layout';

function walkable(layout: AreaLayout, path: Array<{ x: number; y: number }>, from: { x: number; y: number }) {
  const raw = [...layout.colliders, ...layout.props.filter(p => p.collider && p.when !== 'patrol').map(p => p.collider!)];
  let a = from;
  for (const b of path) {
    for (let t = 0; t <= 1; t += 0.02) {
      const x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      for (const r of raw) if (x > r.x + 1 && x < r.x + r.w - 1 && y > r.y + 1 && y < r.y + r.h - 1) return false;
    }
    a = b;
  }
  return true;
}

describe('Busca de caminho (tocar para ir)', () => {
  it('na Vila, de casa até a porta do bar, contorna moto, banco, árvore e mesas', () => {
    const from = { x: 420, y: 640 }, to = { x: 1768, y: 628 };
    const p = findPath(VILA, from, to)!;
    expect(p).not.toBeNull();
    expect(p[p.length - 1]).toEqual(to);
    expect(walkable(VILA, p, from)).toBe(true);
  });
  it('no bar, da porta até a frente do balcão, desvia das mesas', () => {
    const from = { x: 1040, y: 493 }, to = { x: 400, y: 560 };
    const p = findPath(BAR, from, to)!;
    expect(p).not.toBeNull();
    expect(walkable(BAR, p, from)).toBe(true);
  });
  it('destino dentro de obstáculo vira a célula livre mais próxima', () => {
    const p = findPath(BAR, { x: 1040, y: 493 }, { x: 370, y: 470 })!; // atrás do balcão
    const last = p[p.length - 1]!;
    expect(obstacles(BAR).some(b => last.x > b.x && last.x < b.x + b.w && last.y > b.y && last.y < b.y + b.h)).toBe(false);
  });
});

describe('rota respeita a pegada real dos pés', () => {
  it('passando por baixo da moto, nenhum ponto da rota deixa os pés (26×14 acima da base) encostarem nela', async () => {
    const { VILA } = await import('../src/world/layout');
    const moto = VILA.props.find(p => p.key === 'moto')!.collider!;
    for (const fromY of [628, 643, 657, 672]) {
      const way = findPath(VILA, { x: 430, y: fromY }, { x: 1738, y: 628 })!;
      expect(way, `de y=${fromY}`).not.toBeNull();
      const pts = [{ x: 430, y: fromY }, ...way];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!, b = pts[i]!;
        const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4);
        for (let k = 0; k <= n; k++) {
          const x = a.x + ((b.x - a.x) * k) / n, y = a.y + ((b.y - a.y) * k) / n;
          const hit = x + 13 > moto.x && x - 13 < moto.x + moto.w && y > moto.y && y - 14 < moto.y + moto.h;
          expect(hit, `pés tocam a moto em (${x.toFixed(0)}, ${y.toFixed(0)}) saindo de y=${fromY}`).toBe(false);
        }
      }
    }
  });
});
