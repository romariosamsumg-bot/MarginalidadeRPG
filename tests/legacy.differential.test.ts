/**
 * Teste diferencial: as regras portadas (src/core/legacy) produzem EXATAMENTE os mesmos
 * números que o código original da v0.4 para as mesmas sequências de ações e sorteios.
 */
import { describe, expect, it } from 'vitest';
import { loadLegacy } from './legacyHarness';
import * as L from '../src/core/legacy/actions';
import * as R from '../src/core/legacy/rules';
import { defaultRpgState, type RpgState } from '../src/core/legacy/state';
import { seededRng, type Rng } from '../src/core/legacy/util';
import { BUSINESSES, CAREERS, DISTRICTS, FACTIONS, GOALS, MISSIONS, SKILLS } from '../src/core/legacy/data';

/** Campos numéricos/estruturais comparados (texto de log e nome ficam de fora por terem sido adaptados). */
function core(s: RpgState | any) {
  const { log, name, city, seasonHistory, ...rest } = s;
  return JSON.parse(JSON.stringify({ ...rest, seasonHistory: (seasonHistory || []).map((h: any) => ({ ...h })), logCount: log.length }));
}

type Step = { kind: string; arg?: any };

function randomPlan(rng: Rng, n: number): Step[] {
  const kinds = ['mission', 'mission', 'mission', 'nextDay', 'nextDay', 'train', 'travel', 'bank', 'buy', 'gig', 'layLow', 'influence', 'news', 'skipNews',
    'career', 'goal', 'foundGang', 'upgrade', 'gangMission', 'fDialogue', 'fPact', 'fClash', 'recruit', 'rally', 'endSeason'];
  const plan: Step[] = [];
  for (let i = 0; i < n; i++) {
    const kind = kinds[rng(0, kinds.length - 1)]!;
    let arg: any;
    switch (kind) {
      case 'mission': arg = MISSIONS[rng(0, MISSIONS.length - 1)]!.id; break;
      case 'train': arg = SKILLS[rng(0, 3)]!.id; break;
      case 'travel': arg = DISTRICTS[rng(0, DISTRICTS.length - 1)]!.id; break;
      case 'bank': arg = { mode: rng(0, 1) ? 'deposit' : 'withdraw', amount: rng(1, 1500) }; break;
      case 'buy': arg = BUSINESSES[rng(0, BUSINESSES.length - 1)]!.id; break;
      case 'influence': arg = rng(0, 1) ? 'contact' : 'dispute'; break;
      case 'news': arg = rng(0, 1); break;
      case 'career': arg = CAREERS[rng(0, 2)]!.id; break;
      case 'goal': arg = GOALS[rng(0, 2)]!.id; break;
      case 'fDialogue': case 'fPact': case 'fClash': arg = FACTIONS[rng(0, 2)]!.id; break;
    }
    plan.push({ kind, arg });
  }
  return plan;
}

function runLegacy(api: any, window: any, st: Step): void {
  const s = api.state;
  switch (st.kind) {
    case 'mission': api.mission(st.arg); break;
    case 'nextDay': if (s.day >= 30) { /* legado notifica e não muda */ api.nextDay(); } else api.nextDay(); break;
    case 'train': api.train(st.arg); break;
    case 'travel': api.travel(st.arg); break;
    case 'bank': {
      let input = window.document.getElementById('bankAmount');
      if (!input) { input = window.document.createElement('input'); input.id = 'bankAmount'; window.document.body.appendChild(input); }
      input.value = String(st.arg.amount); api.bank(st.arg.mode); break;
    }
    case 'buy': api.buy(st.arg); break;
    case 'gig': api.legalGig(); break;
    case 'layLow': api.layLow(); break;
    case 'influence': api.influenceAction(st.arg); break;
    case 'news': if (s.newsPending) api.newsChoice(s.newsPending.id, st.arg); break;
    case 'skipNews': api.skipNews(); break;
    case 'career': api.pickCareer(st.arg); break;
    case 'goal': api.chooseGoal(st.arg); break;
    case 'foundGang': {
      let input = window.document.getElementById('gangName');
      if (!input) { input = window.document.createElement('input'); input.id = 'gangName'; window.document.body.appendChild(input); }
      input.value = 'Turma do Teste'; api.foundGang(); break;
    }
    case 'upgrade': api.upgrade(); break;
    case 'gangMission': api.gangMission(); break;
    case 'fDialogue': api.factionDialogue(st.arg); break;
    case 'fPact': api.factionPact(st.arg); break;
    case 'fClash': api.factionClash(st.arg); break;
    case 'recruit': api.crewRecruit(); break;
    case 'rally': api.crewRally(); break;
    case 'endSeason': api.endSeason(); break;
  }
}

function runPort(s: { v: RpgState }, rng: Rng, st: Step): void {
  const x = structuredClone(s.v);
  let r: L.ActionResult;
  switch (st.kind) {
    case 'mission': r = L.mission(x, rng, st.arg); break;
    case 'nextDay': r = L.nextDay(x, rng); break;
    case 'train': r = L.train(x, st.arg); break;
    case 'travel': r = L.travel(x, st.arg); break;
    case 'bank': r = L.bank(x, st.arg.mode, st.arg.amount); break;
    case 'buy': r = L.buy(x, st.arg); break;
    case 'gig': r = L.legalGig(x, rng); break;
    case 'layLow': r = L.layLow(x); break;
    case 'influence': r = L.influenceAction(x, rng, st.arg); break;
    case 'news': r = x.newsPending ? L.newsChoice(x, x.newsPending.id, st.arg) : { ok: false, msg: '' }; break;
    case 'skipNews': r = L.skipNews(x); break;
    case 'career': r = L.pickCareer(x, st.arg); break;
    case 'goal': r = L.chooseGoal(x, st.arg); break;
    case 'foundGang': r = L.foundGang(x, 'Turma do Teste'); break;
    case 'upgrade': r = L.upgrade(x); break;
    case 'gangMission': r = L.gangMission(x, rng); break;
    case 'fDialogue': r = L.factionDialogue(x, rng, st.arg); break;
    case 'fPact': r = L.factionPact(x, st.arg); break;
    case 'fClash': r = L.factionClash(x, rng, st.arg); break;
    case 'recruit': r = L.crewRecruit(x); break;
    case 'rally': r = L.crewRally(x); break;
    case 'endSeason': { const e = L.endSeason(x); if (e.next) { s.v = e.next; return; } r = e.result; break; }
    default: throw new Error(st.kind);
  }
  if (r.ok) s.v = x; // commit atômico
}

describe('Diferencial v0.4 × port TypeScript', () => {
  it('estado inicial idêntico (exceto texto do registro inicial)', () => {
    const { api } = loadLegacy(seededRng(1));
    const legacy = api.defaultState('Teste', 'Rio de Janeiro');
    const port = defaultRpgState('Teste', 'Rio de Janeiro');
    expect(core(port)).toEqual(core(legacy));
    expect(legacy.log.length).toBe(port.log.length);
  });

  for (const seed of [11, 42, 777, 2024, 31337, 9001, 123456, 55, 8, 99]) {
    it(`sequência aleatória de 400 ações produz o mesmo estado (semente ${seed})`, () => {
      const planRng = seededRng(seed * 7 + 3);
      const plan = randomPlan(planRng, 400);
      const legacyRng = seededRng(seed);
      const portRng = seededRng(seed);
      const { api, window } = loadLegacy(legacyRng);
      api.state = api.defaultState('Teste', 'Recife');
      const port = { v: defaultRpgState('Teste', 'Recife') };
      for (let i = 0; i < plan.length; i++) {
        const st = plan[i]!;
        runLegacy(api, window, st);
        runPort(port, portRng, st);
        const a = core(api.state), b = core(port.v);
        if (JSON.stringify(a) !== JSON.stringify(b)) {
          expect({ step: i, action: st, port: b }).toEqual({ step: i, action: st, port: a });
        }
      }
      // Fórmulas de leitura coincidem no estado final.
      for (const m of MISSIONS) expect(R.chance(port.v, m)).toBe(api.chance(m));
      expect(R.power(port.v)).toBe(api.power());
      expect(R.income(port.v)).toBe(api.income());
      expect(R.strength(port.v)).toBe(api.strength());
      expect(R.gangOdds(port.v)).toBe(api.gangOdds());
      for (const d of DISTRICTS) expect(R.clashOdds(port.v, d.id)).toBe(api.clashOdds(d.id));
      for (const g of GOALS) expect(R.goalProgress(port.v, g.id)).toEqual(api.goalProgress(g.id));
    });
  }

  it('validate() da v0.4 e validateRpg aceitam/rejeitam os mesmos casos básicos', async () => {
    const { validateRpg } = await import('../src/core/legacy/state');
    const { api } = loadLegacy(seededRng(3));
    const good = api.defaultState('Teste', 'Salvador');
    const cases = [good, { ...good, day: 31 }, { ...good, cash: -1 }, { ...good, name: 'x' }, { ...good, district: 'marte' }, { ...good, businesses: ['bar', 'bar'] }, { ...good, schema: 2 }, null];
    for (const c of cases) expect(validateRpg(c)).toBe(api.validate(c));
  });
});
