/**
 * Bico no balcão do Bar do Nando: versão com habilidade de `legalGig` (v0.4).
 * Mesmas regras de entrada (não detido, energia ≥ 28), mesmo custo e o mesmo −4 de pressão;
 * só o pagamento vem do desempenho no mini game (ver src/minigames/pedidos.ts). Não altera fórmulas legadas.
 */
import type { GameState } from './state';
import type { ActionResult } from './legacy/actions';
import { log } from './legacy/actions';
import { clamp } from './legacy/util';
import { BICO_ENERGY, PEDIDOS_MAX, bicoPay } from '../minigames/pedidos';

export function bicoBalcao(s: GameState, score: number | null): ActionResult {
  const r = s.rpg;
  if (r.jail > 0) return { ok: false, msg: 'Você não pode fazer o bico agora.', error: true };
  if (r.energy < BICO_ENERGY) return { ok: false, msg: 'Energia insuficiente. Descanse para avançar o dia.', error: true };
  if (score !== null && !Number.isFinite(score)) return { ok: false, msg: 'Resultado inválido.', error: true };
  const pts = score === null ? Math.round(PEDIDOS_MAX / 2) : clamp(Math.round(score), 0, PEDIDOS_MAX);
  const pay = bicoPay(pts);
  r.energy -= BICO_ENERGY; r.cash += pay; r.heat = clamp(r.heat - 4, 0, 100);
  const best = Number(s.story.flags['pedidos_recorde'] ?? 0);
  if (score !== null && pts > best) s.story.flags['pedidos_recorde'] = pts;
  s.story.flags['pedidos_vezes'] = Number(s.story.flags['pedidos_vezes'] ?? 0) + 1;
  log(r, `Bico no balcão do Nando: ${pts}/${PEDIDOS_MAX} pedidos certos, R$ ${pay} recebidos.`);
  return { ok: true, msg: `Bico concluído: ${pts}/${PEDIDOS_MAX} pedidos certos. +R$ ${pay}`, data: { pay, pts } };
}
