/** Utilidades portadas da v0.4 (linhas 117–121). */

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

/** Gerador de inteiros inclusivo [min, max]. Injetável para testes determinísticos. */
export type Rng = (min: number, max: number) => number;

/** Mesmo algoritmo da v0.4: crypto.getRandomValues com módulo; fallback Math.random. */
export const cryptoRng: Rng = (min, max) => {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(values);
  else values[0] = Math.floor(Math.random() * 4294967296);
  return min + values[0]! % (max - min + 1);
};

/** RNG determinístico (mulberry32) para testes e simulações. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return (min, max) => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    return min + Math.floor(r * (max - min + 1));
  };
}

/** RNG roteirizado: devolve valores de uma fila (para testes de caracterização). */
export function scriptedRng(values: number[]): Rng & { calls: Array<[number, number]> } {
  const queue = [...values];
  const calls: Array<[number, number]> = [];
  const fn = ((min: number, max: number) => {
    calls.push([min, max]);
    if (!queue.length) throw new Error(`scriptedRng esgotado (chamada ${calls.length}: ${min}..${max})`);
    const v = queue.shift()!;
    if (v < min || v > max) throw new Error(`scriptedRng: ${v} fora de ${min}..${max}`);
    return v;
  }) as Rng & { calls: Array<[number, number]> };
  fn.calls = calls;
  return fn;
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('pt-BR');
export const format = (n: number): string => BRL.format(Math.round(n || 0));
export const num = (n: number): string => NUM.format(Math.round(n || 0));
