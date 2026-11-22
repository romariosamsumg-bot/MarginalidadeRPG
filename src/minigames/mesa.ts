/**
 * A Mesa (A2-M02): negociação com Gaspar, que fala pelo Cais do Norte (personagem fictício).
 * Vânia ensina três sinais; o jogador lê o sinal de cada rodada e escolhe a resposta.
 * Negociação abstrata: nada de valores, rotas ou procedimentos — só leitura de pessoas.
 */
import type { Rng } from '../core/legacy/util';

export type MesaMove = 'esperar' | 'pressionar' | 'saida';
export const MOVES: Array<{ id: MesaMove; label: string }> = [
  { id: 'esperar', label: 'Esperar em silêncio' },
  { id: 'pressionar', label: 'Pressionar' },
  { id: 'saida', label: 'Oferecer uma saída' }
];

export interface MesaRound { id: string; line: string; cue: string; right: MesaMove }

export const ROUNDS: MesaRound[] = [
  { id: 'relogio1', line: '“Dez anos a gente cuida daquela rua. Não vai ser agora que—”', cue: 'Ele para no meio da frase e olha o relógio.', right: 'esperar' },
  { id: 'relogio2', line: '“Eu tenho outro compromisso. Vamos logo com isso.”', cue: 'Ele confere o relógio de novo, sem disfarçar.', right: 'esperar' },
  { id: 'numero1', line: '“Quinze dias sem ninguém da Vila perto do galpão. Quinze. Isso é o mínimo: quinze.”', cue: 'Ele repete o número, cada vez mais alto.', right: 'pressionar' },
  { id: 'numero2', line: '“Três condições. Três, e nenhuma a menos. Três.”', cue: 'Ele bate três vezes na mesa enquanto repete.', right: 'pressionar' },
  { id: 'baixo1', line: '“…Meu pessoal não quer polícia rondando o galpão.”', cue: 'Ele fala baixo e olha para a porta.', right: 'saida' },
  { id: 'baixo2', line: '“Se isso der errado, quem leva a culpa sou eu.”', cue: 'A voz dele quase some.', right: 'saida' }
];

export const MESA_ROUNDS = 4;
export const MESA_MAX = MESA_ROUNDS * 2;
export const MESA_SECONDS = 9;
export const MESA_FAST = 5;

/** Quatro rodadas sem repetir, com pelo menos um sinal de cada tipo. */
export function pickRounds(rng: Rng): MesaRound[] {
  for (let guard = 0; guard < 50; guard++) {
    const pool = [...ROUNDS];
    const out: MesaRound[] = [];
    while (out.length < MESA_ROUNDS) out.push(pool.splice(rng(0, pool.length - 1), 1)[0]!);
    if (new Set(out.map(r => r.right)).size === 3) return out;
  }
  return [ROUNDS[0]!, ROUNDS[2]!, ROUNDS[4]!, ROUNDS[1]!];
}

/** 2 = leitura certa e rápida; 1 = certa, mas demorou; 0 = errada ou sem resposta. */
export function movePoints(move: MesaMove | null, round: MesaRound, seconds: number): 0 | 1 | 2 {
  if (!move || move !== round.right || seconds > MESA_SECONDS) return 0;
  return seconds <= MESA_FAST ? 2 : 1;
}
