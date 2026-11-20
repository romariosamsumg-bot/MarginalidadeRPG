/**
 * Store único e autoritativo da carreira.
 * - Toda mudança passa por dispatch(action) → rascunho clonado → regra → commit atômico.
 * - Ação recusada (ok=false) descarta o rascunho: nenhum estado parcial.
 * - Phaser e HTML apenas LEEM o estado e despacham ações; nenhum guarda cópia própria.
 */
import * as L from './legacy/actions';
import type { Rng } from './legacy/util';
import { cryptoRng } from './legacy/util';
import { newGame, type Appearance, type AreaId, type GameState } from './state';
import * as N from '../narrative/engine';
import type { PanelId } from '../narrative/types';

export type Action =
  | { type: 'game/new'; name: string; city: string; appearance: Appearance; career: string | null }
  | { type: 'game/replace'; state: GameState }
  | { type: 'rpg/career'; id: string }
  | { type: 'rpg/goal'; id: string }
  | { type: 'rpg/news'; id: string; index: number }
  | { type: 'rpg/skipNews' }
  | { type: 'rpg/influence'; mode: 'contact' | 'dispute' }
  | { type: 'rpg/gig' }
  | { type: 'rpg/layLow' }
  | { type: 'rpg/mission'; id: string }
  | { type: 'rpg/nextDay' }
  | { type: 'rpg/train'; id: string }
  | { type: 'rpg/travel'; id: string }
  | { type: 'rpg/bank'; mode: 'deposit' | 'withdraw'; amount: number }
  | { type: 'rpg/buy'; id: string }
  | { type: 'rpg/foundGang'; name: string }
  | { type: 'rpg/upgrade' }
  | { type: 'rpg/gangMission' }
  | { type: 'rpg/factionDialogue'; id: string }
  | { type: 'rpg/factionPact'; id: string }
  | { type: 'rpg/factionClash'; id: string }
  | { type: 'rpg/recruit' }
  | { type: 'rpg/rally' }
  | { type: 'rpg/endSeason' }
  | { type: 'story/start'; sceneId: string }
  | { type: 'story/advance'; nodeId: string }
  | { type: 'story/choose'; nodeId: string; choiceId: string }
  | { type: 'story/dismiss' }
  | { type: 'world/move'; area: AreaId; x: number; y: number; facing: 1 | -1 };

export interface Result { ok: boolean; msg: string; error?: boolean; data?: Record<string, unknown>; openPanel?: PanelId; ended?: boolean; silent?: boolean }

type Listener = (s: GameState | null, a: Action | null, r: Result | null) => void;

/** Ações silenciosas (sem toast nem re-render pesado). */
const SILENT = new Set<Action['type']>(['world/move']);

export class Store {
  private state: GameState | null = null;
  private listeners = new Set<Listener>();
  private dispatching = false;

  constructor(private persist: (s: GameState) => boolean, public rng: Rng = cryptoRng) {}

  get(): GameState | null { return this.state; }

  /** Cópia profunda para leitores que precisam de um retrato estável (ex.: testes e2e). */
  snapshot(): GameState | null { return this.state ? structuredClone(this.state) : null; }

  subscribe(fn: Listener): () => void { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** Substitui o estado sem passar por regras (carregamento validado do disco). */
  hydrate(s: GameState | null): void {
    this.state = s;
    if (s) N.repairDialogue(s);
    this.emit(null, null);
  }

  dispatch(action: Action): Result {
    if (this.dispatching) return { ok: false, msg: 'Ação ignorada: outra ação em andamento.', error: true };
    this.dispatching = true;
    try {
      if (action.type === 'game/new') {
        const name = L.sanitizeName(action.name);
        if (name.length < 2 || name.length > 22) return { ok: false, msg: 'Escolha um codinome entre 2 e 22 caracteres.', error: true };
        const s = newGame(name, action.city, action.appearance);
        if (action.career) L.pickCareer(s.rpg, action.career);
        return this.commit(s, action, { ok: true, msg: `Bem-vindo de volta à Vila, ${name}.` });
      }
      if (action.type === 'game/replace') return this.commit(structuredClone(action.state), action, { ok: true, msg: 'Carreira carregada.' });
      if (!this.state) return { ok: false, msg: 'Nenhuma carreira ativa.', error: true };
      // Durante uma cena única, ações de carreira ficam bloqueadas para evitar estados cruzados.
      const busy = this.state.story.activeDialogue && !action.type.startsWith('story/') && action.type !== 'world/move';
      if (busy) return { ok: false, msg: 'Termine a conversa antes de fazer outra coisa.', error: true };
      const draft = structuredClone(this.state);
      const r = this.reduce(draft, action);
      if (!r.ok) return r;
      if (action.type === 'rpg/endSeason') return this.commit(draft, action, r);
      return this.commit(draft, action, r);
    } catch (err) {
      console.error('[store] falha ao aplicar ação', action.type, err);
      return { ok: false, msg: 'Erro interno ao aplicar a ação. Nada foi alterado.', error: true };
    } finally {
      this.dispatching = false;
    }
  }

  private commit(next: GameState, action: Action, r: Result): Result {
    next.updatedAt = new Date().toISOString();
    this.state = next;
    const saved = this.persist(next);
    if (!saved && !SILENT.has(action.type)) r = { ...r, msg: `${r.msg} (Atenção: não foi possível salvar no navegador — exporte uma cópia.)`, error: true };
    this.emit(action, { ...r, silent: SILENT.has(action.type) });
    return r;
  }

  private emit(a: Action | null, r: Result | null) { for (const fn of this.listeners) fn(this.state, a, r); }

  private reduce(s: GameState, a: Action): Result {
    const rpg = s.rpg, rng = this.rng;
    switch (a.type) {
      case 'rpg/career': return L.pickCareer(rpg, a.id);
      case 'rpg/goal': return L.chooseGoal(rpg, a.id);
      case 'rpg/news': return L.newsChoice(rpg, a.id, a.index);
      case 'rpg/skipNews': return L.skipNews(rpg);
      case 'rpg/influence': return L.influenceAction(rpg, rng, a.mode);
      case 'rpg/gig': return L.legalGig(rpg, rng);
      case 'rpg/layLow': return L.layLow(rpg);
      case 'rpg/mission': return L.mission(rpg, rng, a.id);
      case 'rpg/nextDay': return L.nextDay(rpg, rng);
      case 'rpg/train': return L.train(rpg, a.id);
      case 'rpg/travel': return L.travel(rpg, a.id);
      case 'rpg/bank': return L.bank(rpg, a.mode, a.amount);
      case 'rpg/buy': return L.buy(rpg, a.id);
      case 'rpg/foundGang': return L.foundGang(rpg, a.name);
      case 'rpg/upgrade': return L.upgrade(rpg);
      case 'rpg/gangMission': return L.gangMission(rpg, rng);
      case 'rpg/factionDialogue': return L.factionDialogue(rpg, rng, a.id);
      case 'rpg/factionPact': return L.factionPact(rpg, a.id);
      case 'rpg/factionClash': return L.factionClash(rpg, rng, a.id);
      case 'rpg/recruit': return L.crewRecruit(rpg);
      case 'rpg/rally': return L.crewRally(rpg);
      case 'rpg/endSeason': {
        const { result, next } = L.endSeason(rpg);
        if (next) s.rpg = next; // campanha, relações e mundo continuam: a história não reinicia com a temporada.
        return result;
      }
      case 'story/start': return this.story(N.startScene(s, a.sceneId));
      case 'story/advance': return this.story(N.advance(s, a.nodeId));
      case 'story/choose': return this.story(N.choose(s, a.nodeId, a.choiceId));
      case 'story/dismiss': return this.story(N.dismiss(s));
      case 'world/move': {
        if (!Number.isFinite(a.x) || !Number.isFinite(a.y) || (a.area !== 'vila' && a.area !== 'bar')) return { ok: false, msg: 'Posição inválida.' };
        s.world.area = a.area; s.world.x = Math.round(a.x); s.world.y = Math.round(a.y); s.world.facing = a.facing === -1 ? -1 : 1;
        return { ok: true, msg: '' };
      }
    }
    return { ok: false, msg: 'Ação desconhecida.', error: true };
  }

  private story(r: N.StoryResult): Result {
    return { ok: r.ok, msg: r.msg || '', error: !r.ok, openPanel: r.openPanel, ended: r.ended };
  }
}
