/**
 * O Mural do Carro Prata (depois do Ato I): linha do tempo da sexta-feira com pistas
 * relativas + identificar a fala que contradiz a linha do tempo. Fatos coerentes com o Ato I:
 * mensagem 17h52, encontro 18h10, "visto por último 18:32", carro prata ~19h (Solange).
 */
export interface Clue { id: string; who: string; text: string }

/** Na ordem correta. A interface embaralha. */
export const TIMELINE: Clue[] = [
  { id: 'lia', who: 'Lia', text: '“Ele passou aqui em casa de tarde, antes de te mandar mensagem. Nem aceitou café.”' },
  { id: 'msg', who: 'Seu celular', text: 'Mensagem do Magrão: “passa na oficina antes d eu fechar” — 17h52.' },
  { id: 'oficina', who: 'Você', text: 'Encontrou o Magrão fechando a Oficina 24 — 18h10.' },
  { id: 'visto', who: 'Celular do Magrão', text: '“Visto por último: sexta-feira, 18:32.”' },
  { id: 'bar', who: 'Nando', text: '“Ele passou no bar uns dez minutos depois de sumir do celular. Pagou uma conta antiga e saiu apressado.”' },
  { id: 'carro', who: 'Dona Solange', text: '“O carro prata parou na oficina umas sete. Ele saiu correndo pela escadaria.”' }
];

export interface Statement { id: string; who: string; text: string; lie: boolean }
export const STATEMENTS: Statement[] = [
  { id: 'miro', who: 'Miro, para quem quisesse ouvir', text: '“O Magrão passou a tarde inteira trancado na oficina.”', lie: true },
  { id: 'ze', who: 'Seu Zé', text: '“Vi o Magrão passar correndo. Já tava escuro.”', lie: false },
  { id: 'nando', who: 'Nando', text: '“Ele pagou o que devia e disse que agora tava tudo certo.”', lie: false }
];

export const MURAL_MAX = 5;

/** Pontos da linha do tempo pelos toques errados: 0 → 2, 1–2 → 1, 3+ → 0. */
export function timelinePoints(mistakes: number): 0 | 1 | 2 {
  return mistakes <= 0 ? 2 : mistakes <= 2 ? 1 : 0;
}
/** Achar a mentira vale 3: com isso, qualquer resultado ≥ 3 significa que a contradição foi encontrada. */
export function muralScore(mistakes: number, foundLie: boolean): number {
  return timelinePoints(mistakes) + (foundLie ? 3 : 0);
}
