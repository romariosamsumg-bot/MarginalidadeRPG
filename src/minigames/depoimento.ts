/**
 * O Depoimento (A1-M05): perguntas sobre fatos que o jogador viveu no Ato I.
 * A resposta certa é sempre o que aconteceu de verdade no jogo; as outras são plausíveis.
 */
import type { GameState } from '../core/state';

export interface Question { id: string; q: string; right: string; wrong: [string, string] }

export const SECONDS_PER_QUESTION = 9;
export const FAST_SECONDS = 5;
export const DEPOIMENTO_MAX = 8;

const Q_OFICINA: Question = { id: 'oficina', q: 'Na sexta, a que horas o Magrão te chamou na oficina?', right: 'Pouco depois das seis da tarde', wrong: ['Perto do meio-dia', 'Depois das dez da noite'] };
const Q_ONLINE: Question = { id: 'online', q: 'O celular dele ficou on-line até que horas?', right: 'Até umas seis e meia de sexta', wrong: ['Até a meia-noite de sexta', 'Até sábado de manhã'] };
const Q_SABADO: Question = { id: 'sabado', q: 'E no sábado à noite, onde você estava?', right: 'No Bar do Nando', wrong: ['Em casa, dormindo', 'No ponto de ônibus da avenida'] };
const Q_BALCAO: Question = { id: 'balcao', q: 'Quem estava atrás do balcão do bar no sábado?', right: 'O Nando', wrong: ['O Seu Zé', 'Ninguém, o bar estava fechado'] };
const Q_CARRO: Question = { id: 'carro', q: 'Esse carro prata. A que horas ele apareceu na sexta?', right: 'Umas sete da noite', wrong: ['Umas cinco da tarde', 'Depois da meia-noite'] };
const Q_FUGA: Question = { id: 'fuga', q: 'E para onde o Magrão correu?', right: 'Pela escadaria do fim da rua', wrong: ['Pela avenida, para o ponto', 'Para dentro do bar'] };

/** As perguntas mudam se o jogador contou do carro prata para Helena. */
export function depoimentoQuestions(s: GameState): Question[] {
  return s.story.flags['helena_car'] === true ? [Q_OFICINA, Q_ONLINE, Q_CARRO, Q_FUGA] : [Q_OFICINA, Q_ONLINE, Q_SABADO, Q_BALCAO];
}

/** 2 = certa e firme; 1 = certa, mas hesitou; 0 = errada ou sem resposta. */
export function answerPoints(correct: boolean, seconds: number): 0 | 1 | 2 {
  if (!correct || seconds > SECONDS_PER_QUESTION) return 0;
  return seconds <= FAST_SECONDS ? 2 : 1;
}
