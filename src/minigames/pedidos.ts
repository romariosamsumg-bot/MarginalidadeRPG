/**
 * Pedidos no Balcão (bico no Bar do Nando). Versão com habilidade do "bico legal" da v0.4:
 * mesmo custo de energia (28) e mesmo alívio de pressão (−4). O pagamento vai de R$ 90 a R$ 190
 * conforme o desempenho; o meio da faixa (R$ 140) é a média do bico sorteado legado (R$ 110–170).
 */
import type { Rng } from '../core/legacy/util';

export interface MenuItem { id: string; label: string; icon: string }
export const MENU: MenuItem[] = [
  { id: 'agua', label: 'Água', icon: '💧' },
  { id: 'cafe', label: 'Café', icon: '☕' },
  { id: 'suco', label: 'Suco', icon: '🍊' },
  { id: 'refri', label: 'Refri', icon: '🥤' },
  { id: 'pastel', label: 'Pastel', icon: '🥟' },
  { id: 'pao', label: 'Pão na chapa', icon: '🍞' }
];

export const ROUND_SIZES = [2, 3, 4, 5];
export const PEDIDOS_MAX = ROUND_SIZES.reduce((a, b) => a + b, 0);
export const BICO_ENERGY = 28;
export const SECONDS_PER_ITEM = 2.6;
const CUSTOMERS = ['Seu Zé', 'Dona Cida', 'Tião', 'Bia', 'Jorge', 'Dona Neide', 'Rafa'];

export interface Order { customer: string; items: string[] }

/** Pedido de uma rodada. Itens podem repetir a partir da 3ª rodada (fica mais difícil). */
export function makeOrder(rng: Rng, round: number): Order {
  const size = ROUND_SIZES[Math.min(round, ROUND_SIZES.length - 1)]!;
  const items: string[] = [];
  while (items.length < size) {
    const id = MENU[rng(0, MENU.length - 1)]!.id;
    if (round < 2 && items.includes(id)) continue;
    items.push(id);
  }
  return { customer: CUSTOMERS[rng(0, CUSTOMERS.length - 1)]!, items };
}

/** Frase do freguês, em português natural. */
export function orderLine(o: Order): string {
  const names = o.items.map(id => MENU.find(m => m.id === id)!.label.toLowerCase());
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}` : names[0];
  return `Me vê ${list}, nessa ordem.`;
}

/** Pagamento pelo desempenho (score 0–PEDIDOS_MAX). */
export function bicoPay(score: number): number {
  const sc = Math.max(0, Math.min(PEDIDOS_MAX, Math.round(score)));
  return 90 + Math.round((100 * sc) / PEDIDOS_MAX);
}
