/**
 * Interface dos mini games (DOM, por cima do mapa). A lógica e o conteúdo ficam em src/minigames/;
 * quem grava o resultado é o store (story/minigame ou bico/balcao) — esta tela só mede o desempenho.
 * Toque e teclado (1–6 escolhem, Enter/Espaço continuam). Todo desafio pode ser pulado na abertura.
 */
import type { GameState } from '../core/state';
import { cryptoRng } from '../core/legacy/util';
import { MINIGAME_INFO, type MinigameId } from '../minigames/types';
import { depoimentoQuestions, answerPoints, SECONDS_PER_QUESTION, DEPOIMENTO_MAX } from '../minigames/depoimento';
import { TIMELINE, STATEMENTS, muralScore, MURAL_MAX } from '../minigames/mural';
import { MENU, ROUND_SIZES, SECONDS_PER_ITEM, PEDIDOS_MAX, makeOrder, orderLine, bicoPay, type Order } from '../minigames/pedidos';
import { esc } from './dom';

export interface MinigameDeps {
  state: () => GameState | null;
  reducedMotion: () => boolean;
  sfx: (name: string) => void;
}

export interface OpenOptions {
  /** Resultado final (pontos) ou null se o jogador pulou. */
  onDone: (score: number | null) => void;
  /** Só para desafios avulsos (bico): desistir sem jogar. */
  onCancel?: () => void;
}

const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = cryptoRng(0, i); [b[i], b[j]] = [b[j]!, b[i]!]; } return b; };

export class MinigameView {
  private root: HTMLElement;
  private timers: number[] = [];
  private raf = 0;
  private keyHandler: ((k: string) => boolean) | null = null;
  private current: MinigameId | null = null;

  constructor(parent: HTMLElement, private d: MinigameDeps) {
    this.root = document.createElement('div');
    this.root.className = 'mg-root hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    parent.appendChild(this.root);
    window.addEventListener('keydown', e => {
      if (!this.open || !this.keyHandler) return;
      const k = /^Digit[1-9]$/.test(e.code) ? e.code.slice(5) : /^Numpad[1-9]$/.test(e.code) ? e.code.slice(6) : e.code === 'Space' || e.code === 'Enter' ? 'ok' : e.code === 'Escape' ? 'esc' : '';
      if (k && this.keyHandler(k)) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
  }

  get open() { return !this.root.classList.contains('hidden'); }
  /** Qual desafio está aberto (para não reabrir a mesma tela a cada renderização). */
  get active() { return this.current; }

  /** Tela de abertura: explica o desafio e oferece jogar ou pular. */
  show(id: MinigameId, o: OpenOptions) {
    this.reset();
    this.current = id;
    const info = MINIGAME_INFO[id];
    this.root.setAttribute('aria-label', info.title);
    this.root.classList.remove('hidden');
    this.root.innerHTML = `<div class="mg"><div class="mg-intro">
      <p class="mg-kicker">Desafio</p><h2>${esc(info.title)}</h2><p>${esc(info.how)}</p>
      <div class="mg-actions">
        <button type="button" class="btn primary block" data-mg="start"><span class="n">1</span> Começar</button>
        <button type="button" class="btn block" data-mg="skip"><span class="n">2</span> ${esc(info.skipLabel)}</button>
        ${o.onCancel ? '<button type="button" class="btn ghost block" data-mg="cancel"><span class="n">3</span> Agora não</button>' : ''}
      </div></div></div>`;
    const start = () => { this.d.sfx('card'); this.play(id, o); };
    const skip = () => { this.close(); o.onDone(null); };
    const cancel = () => { if (!o.onCancel) return false; this.close(); o.onCancel(); return true; };
    this.bind({ start, skip, cancel: () => void cancel() });
    this.keyHandler = k => {
      if (k === '1' || k === 'ok') { start(); return true; }
      if (k === '2') { skip(); return true; }
      if (k === '3' || k === 'esc') return cancel() || k === 'esc';
      return false;
    };
    (this.root.querySelector('[data-mg="start"]') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  close() {
    this.reset();
    this.current = null;
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  private reset() {
    this.timers.forEach(t => clearTimeout(t)); this.timers = [];
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.keyHandler = null;
    this.root.onclick = null;
  }

  private later(ms: number, fn: () => void) { this.timers.push(window.setTimeout(fn, this.d.reducedMotion() ? Math.min(ms, 250) : ms)); }

  private bind(map: Record<string, () => void>) {
    this.root.onclick = e => {
      const b = (e.target as HTMLElement).closest('[data-mg]') as HTMLElement | null;
      if (b && !(b as HTMLButtonElement).disabled) map[b.dataset.mg!]?.();
    };
  }

  /** Barra de tempo: chama onEnd quando zera. Retorna função que devolve os segundos gastos. */
  private timer(bar: HTMLElement | null, seconds: number, onEnd: () => void): () => number {
    const t0 = performance.now();
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const el = (performance.now() - t0) / 1000;
      if (bar) bar.style.transform = `scaleX(${Math.max(0, 1 - el / seconds)})`;
      if (el >= seconds) { stopped = true; onEnd(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    return () => { stopped = true; cancelAnimationFrame(this.raf); return (performance.now() - t0) / 1000; };
  }

  private finish(title: string, lines: string, score: number, o: OpenOptions) {
    this.reset();
    this.root.innerHTML = `<div class="mg"><div class="mg-intro mg-end"><p class="mg-kicker">Resultado</p><h2>${esc(title)}</h2>${lines}
      <div class="mg-actions"><button type="button" class="btn primary block" data-mg="done">Continuar</button></div></div></div>`;
    const done = () => { this.close(); o.onDone(score); };
    this.bind({ done });
    this.keyHandler = k => { if (k === 'ok' || k === '1') { done(); return true; } return k === 'esc'; };
    (this.root.querySelector('[data-mg="done"]') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private play(id: MinigameId, o: OpenOptions) {
    this.reset();
    if (id === 'depoimento') this.depoimento(o);
    else if (id === 'mural') this.mural(o);
    else this.pedidos(o);
  }

  /* ------------------------------ O Depoimento ------------------------------ */

  private depoimento(o: OpenOptions) {
    const s = this.d.state();
    if (!s) return;
    const qs = depoimentoQuestions(s);
    let i = 0, score = 0;
    const marks: string[] = [];
    const ask = () => {
      this.reset();
      const q = qs[i]!;
      const opts = shuffle([{ t: q.right, ok: true }, { t: q.wrong[0], ok: false }, { t: q.wrong[1], ok: false }]);
      this.root.innerHTML = `<div class="mg"><div class="mg-play">
        <div class="mg-head"><span>Pergunta ${i + 1}/${qs.length}</span><span class="mg-marks" aria-label="Respostas anteriores">${marks.join(' ')}</span></div>
        <div class="mg-time" aria-hidden="true"><i></i></div>
        <p class="mg-who">Helena Paiva</p><p class="mg-q">${esc(q.q)}</p>
        <div class="mg-opts">${opts.map((x, k) => `<button type="button" class="choice" data-mg="a${k}"><span class="n">${k + 1}</span><span>${esc(x.t)}</span></button>`).join('')}</div>
        <p class="mg-fb" aria-live="polite"></p></div></div>`;
      let answered = false;
      const stop = this.timer(this.root.querySelector('.mg-time i'), SECONDS_PER_QUESTION, () => answer(-1));
      const answer = (k: number) => {
        if (answered) return;
        answered = true;
        const secs = k < 0 ? SECONDS_PER_QUESTION + 1 : stop();
        const pts = answerPoints(k >= 0 && opts[k]!.ok, secs);
        score += pts;
        marks.push(pts === 2 ? '●' : pts === 1 ? '◐' : '○');
        this.root.querySelectorAll<HTMLButtonElement>('[data-mg]').forEach(b => { b.disabled = true; });
        if (k >= 0) this.root.querySelector(`[data-mg="a${k}"]`)?.classList.add(opts[k]!.ok ? 'mg-right' : 'mg-wrong');
        (this.root.querySelector('.mg-fb') as HTMLElement).textContent =
          k < 0 ? 'Você ficou em silêncio. Helena anota mesmo assim.' : pts === 2 ? 'Firme. Ela anota sem levantar os olhos.' : pts === 1 ? 'Certo, mas você demorou. Ela percebeu.' : 'Ela franze a testa. Não bate com o que ouviu.';
        this.d.sfx(pts ? 'confirm' : 'error');
        this.later(1100, () => { i++; if (i < qs.length) ask(); else end(); });
      };
      this.bind(Object.fromEntries(opts.map((_, k) => [`a${k}`, () => answer(k)])));
      this.keyHandler = k => { const n = Number(k); if (n >= 1 && n <= 3) { answer(n - 1); return true; } return k === 'esc' || k === 'ok'; };
    };
    const end = () => {
      const verdict = score >= 6 ? 'Respostas firmes.' : score >= 3 ? 'Você hesitou em algumas.' : 'Muita coisa não bateu.';
      this.finish('O Depoimento', `<p class="mg-big">${score}/${DEPOIMENTO_MAX}</p><p>${esc(verdict)}</p><p class="mg-legend">● firme · ◐ hesitou · ○ não bateu</p>`, score, o);
    };
    ask();
  }

  /* ------------------------- O Mural do Carro Prata ------------------------- */

  private mural(o: OpenOptions) {
    const cards = shuffle(TIMELINE);
    const placed: string[] = [];
    let mistakes = 0;
    const timelineHtml = () => `<ol class="mg-line">${TIMELINE.map((c, k) => `<li class="${k < placed.length ? 'on' : ''}">${k < placed.length ? `<b>${esc(c.who)}</b> ${esc(c.text)}` : '<span>?</span>'}</li>`).join('')}</ol>`;
    const step1 = () => {
      this.reset();
      const left = cards.filter(c => !placed.includes(c.id));
      this.root.innerHTML = `<div class="mg"><div class="mg-play mg-scroll">
        <div class="mg-head"><span>Linha do tempo da sexta · ${placed.length}/${TIMELINE.length}</span><span>Erros: ${mistakes}</span></div>
        <p class="mg-q">Toque na pista que aconteceu <b>primeiro</b> entre as que sobraram.</p>
        <div class="mg-opts">${left.map((c, k) => `<button type="button" class="choice mg-clue" data-mg="c${k}"><span class="n">${k + 1}</span><span><b>${esc(c.who)}</b><br>${esc(c.text)}</span></button>`).join('')}</div>
        <p class="mg-fb" aria-live="polite"></p>
        ${placed.length ? `<details class="mg-sofar"><summary>Já na linha do tempo (${placed.length})</summary>${timelineHtml()}</details>` : ''}
      </div></div>`;
      const pick = (k: number) => {
        const c = left[k];
        if (!c) return;
        if (c.id === TIMELINE[placed.length]!.id) {
          placed.push(c.id); this.d.sfx('confirm');
          if (placed.length === TIMELINE.length) step2(); else step1();
        } else {
          mistakes++; this.d.sfx('error');
          const b = this.root.querySelector(`[data-mg="c${k}"]`);
          b?.classList.remove('mg-shake'); void (b as HTMLElement | null)?.offsetWidth; b?.classList.add('mg-shake');
          (this.root.querySelector('.mg-fb') as HTMLElement).textContent = 'Ainda não. Repare nas pistas que dizem "antes" e "depois".';
          (this.root.querySelector('.mg-head span:last-child') as HTMLElement).textContent = `Erros: ${mistakes}`;
        }
      };
      this.bind(Object.fromEntries(left.map((_, k) => [`c${k}`, () => pick(k)])));
      this.keyHandler = k => { const n = Number(k); if (n >= 1 && n <= left.length) { pick(n - 1); return true; } return k === 'esc' || k === 'ok'; };
    };
    const step2 = () => {
      this.reset();
      const sts = shuffle(STATEMENTS);
      this.root.innerHTML = `<div class="mg"><div class="mg-play mg-scroll">
        <div class="mg-head"><span>A sexta-feira, em ordem</span><span>Erros: ${mistakes}</span></div>
        ${timelineHtml()}
        <p class="mg-q">Qual destas falas <b>não fecha</b> com a linha do tempo?</p>
        <div class="mg-opts">${sts.map((x, k) => `<button type="button" class="choice mg-clue" data-mg="s${k}"><span class="n">${k + 1}</span><span><b>${esc(x.who)}</b><br>${esc(x.text)}</span></button>`).join('')}</div>
      </div></div>`;
      const pick = (k: number) => {
        const x = sts[k];
        if (!x) return;
        const score = muralScore(mistakes, x.lie);
        this.d.sfx(x.lie ? 'reward' : 'error');
        this.finish('O Mural do Carro Prata',
          `<p class="mg-big">${score}/${MURAL_MAX}</p><p>${x.lie ? 'Você achou a fala que não fecha.' : 'Essa fala até que fecha. A contradição passou despercebida.'}</p><p class="mg-legend">Linha do tempo com ${mistakes} erro(s).</p>`,
          score, o);
      };
      this.bind(Object.fromEntries(sts.map((_, k) => [`s${k}`, () => pick(k)])));
      this.keyHandler = k => { const n = Number(k); if (n >= 1 && n <= sts.length) { pick(n - 1); return true; } return k === 'esc' || k === 'ok'; };
    };
    step1();
  }

  /* --------------------------- Pedidos no Balcão --------------------------- */

  private pedidos(o: OpenOptions) {
    let round = 0, score = 0;
    const item = (id: string) => MENU.find(m => m.id === id)!;
    const show = (order: Order) => {
      this.reset();
      const memo = 1.4 + 0.75 * order.items.length;
      this.root.innerHTML = `<div class="mg"><div class="mg-play">
        <div class="mg-head"><span>Rodada ${round + 1}/${ROUND_SIZES.length}</span><span>Certos: ${score}</span></div>
        <div class="mg-time slow" aria-hidden="true"><i></i></div>
        <p class="mg-who">${esc(order.customer)}</p><p class="mg-q">${esc(orderLine(order))}</p>
        <div class="mg-tray">${order.items.map(id => `<span class="mg-slot on"><i>${item(id).icon}</i>${esc(item(id).label)}</span>`).join('')}</div>
        <p class="mg-fb">Guarde o pedido…</p>
        <div class="mg-actions"><button type="button" class="btn ghost block" data-mg="go">Já decorei</button></div></div></div>`;
      const go = () => { stop(); serve(order); };
      const stop = this.timer(this.root.querySelector('.mg-time i'), memo, () => serve(order));
      this.bind({ go });
      this.keyHandler = k => { if (k === 'ok') { go(); return true; } return k === 'esc'; };
    };
    const serve = (order: Order) => {
      this.reset();
      const got: string[] = [];
      this.root.innerHTML = `<div class="mg"><div class="mg-play">
        <div class="mg-head"><span>Rodada ${round + 1}/${ROUND_SIZES.length}</span><span>Certos: ${score}</span></div>
        <div class="mg-time" aria-hidden="true"><i></i></div>
        <p class="mg-who">${esc(order.customer)} espera.</p>
        <div class="mg-tray">${order.items.map(() => '<span class="mg-slot">?</span>').join('')}</div>
        <div class="mg-menu">${MENU.map((m, k) => `<button type="button" class="mg-item" data-mg="i${k}"><span class="n">${k + 1}</span><i aria-hidden="true">${m.icon}</i>${esc(m.label)}</button>`).join('')}</div>
        <p class="mg-fb" aria-live="polite">Sirva na ordem do pedido.</p></div></div>`;
      let over = false;
      const endRound = (msg: string) => {
        if (over) return;
        over = true; stop();
        this.root.querySelectorAll<HTMLButtonElement>('[data-mg]').forEach(b => { b.disabled = true; });
        (this.root.querySelector('.mg-fb') as HTMLElement).textContent = msg;
        this.later(1000, () => { round++; if (round < ROUND_SIZES.length) show(makeOrder(cryptoRng, round)); else end(); });
      };
      const stop = this.timer(this.root.querySelector('.mg-time i'), SECONDS_PER_ITEM * order.items.length + 1, () => endRound('O tempo acabou. O freguês desistiu de parte do pedido.'));
      const tap = (k: number) => {
        if (over) return;
        const m = MENU[k];
        if (!m) return;
        const slots = this.root.querySelectorAll<HTMLElement>('.mg-slot');
        const slot = slots[got.length]!;
        if (m.id === order.items[got.length]) {
          got.push(m.id); score++;
          slot.className = 'mg-slot on'; slot.innerHTML = `<i>${m.icon}</i>${esc(m.label)}`;
          (this.root.querySelector('.mg-head span:last-child') as HTMLElement).textContent = `Certos: ${score}`;
          this.d.sfx('confirm');
          if (got.length === order.items.length) endRound('Pedido completo!');
        } else {
          slot.className = 'mg-slot bad'; slot.innerHTML = `<i>${m.icon}</i>${esc(m.label)}`;
          this.d.sfx('error');
          endRound(`Era ${item(order.items[got.length]!).label.toLowerCase()}. O freguês reclamou.`);
        }
      };
      this.bind(Object.fromEntries(MENU.map((_, k) => [`i${k}`, () => tap(k)])));
      this.keyHandler = k => { const n = Number(k); if (n >= 1 && n <= MENU.length) { tap(n - 1); return true; } return k === 'esc' || k === 'ok'; };
    };
    const end = () => {
      this.finish('Pedidos no Balcão', `<p class="mg-big">${score}/${PEDIDOS_MAX}</p><p>Pagamento do Nando: R$ ${bicoPay(score)}.</p>`, score, o);
    };
    show(makeOrder(cryptoRng, 0));
  }
}
