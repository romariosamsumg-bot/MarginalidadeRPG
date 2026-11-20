/**
 * Estado de carreira legado (formato equivalente ao da v0.4, schema 1).
 * Porta de defaultState / validate / normalizeSave (v0.4 linhas 186–227).
 * Mantemos os mesmos nomes de campos para que as fórmulas sejam portáveis 1:1.
 */
import { BUSINESSES, CAREERS, DISTRICTS, FACTIONS, GOALS, MAXDAY, NEWS, type CareerId, type GoalId, type SkillId } from './data';
import { clamp } from './util';

export interface FactionState { relation: number; tension: number; truceUntil: number; lastActionDay: number }
export interface GangStats { confrontWins: number; confrontLosses: number; pacts: number; dialogs: number; retaliations: number; groupWins: number }
export interface LogEntry { day: number; msg: string }
export interface SeasonRecord {
  season: number; respect: number; money: number; success: number; failed: number;
  goal: GoalId | null; goalComplete: boolean; career: CareerId | null; districts: number;
  gangName: string | null; confrontWins: number; confrontLosses: number; pacts: number; groupWins: number;
}

export interface RpgState {
  schema: 1;
  name: string;
  /** Cidade de origem (cidade natal). A localização atual fica em GameState.world. */
  city: string;
  season: number; day: number;
  cash: number; bank: number; energy: number; heat: number; respect: number;
  stats: Record<SkillId, number>;
  district: string;
  jail: number;
  businesses: string[];
  gangName: string | null; gangLevel: number;
  successful: number; failed: number;
  seasonHistory: SeasonRecord[];
  log: LogEntry[];
  eventIndex: number;
  career: CareerId | null;
  goal: GoalId | null;
  influence: Record<string, number>;
  rivals: Record<string, number>;
  newsPending: { id: string; day: number } | null;
  nextBonus: number; goalWins: number;
  crewSize: number; crewMorale: number; crewLastRecruit: number; crewLastRally: number;
  factions: Record<string, FactionState>;
  gangStats: GangStats;
}

export const startFactions = (): Record<string, FactionState> =>
  Object.fromEntries(FACTIONS.map(f => [f.id, { relation: f.initialRelation, tension: 20 + f.temperament, truceUntil: 0, lastActionDay: 0 }]));
export const startGangStats = (): GangStats => ({ confrontWins: 0, confrontLosses: 0, pacts: 0, dialogs: 0, retaliations: 0, groupWins: 0 });
export const initialInfluence = (): Record<string, number> => Object.fromEntries(DISTRICTS.map(d => [d.id, d.id === 'centro' ? 8 : 0]));
export const initialRivals = (): Record<string, number> => Object.fromEntries(DISTRICTS.map((d, i) => [d.id, 22 + i * 3]));

/** Mensagem inicial adaptada à Vila do Dique (texto; valores idênticos à v0.4). */
export const START_LOG = 'Sua carreira começou na Vila do Dique, com algum dinheiro guardado, poucos contatos e muita coisa para provar.';

export function defaultRpgState(name: string, city: string): RpgState {
  return {
    schema: 1, name, city, season: 1, day: 1, cash: 1900, bank: 0, energy: 100, heat: 0, respect: 5,
    stats: { astucia: 6, forca: 4, labia: 4, influencia: 3 }, district: 'centro', jail: 0, businesses: [],
    gangName: null, gangLevel: 0, successful: 0, failed: 0, seasonHistory: [],
    log: [{ day: 1, msg: START_LOG }], eventIndex: 3, career: null, goal: null,
    influence: initialInfluence(), rivals: initialRivals(), newsPending: { id: 'feira', day: 1 },
    nextBonus: 0, goalWins: 0, crewSize: 0, crewMorale: 0, crewLastRecruit: 0, crewLastRally: 0,
    factions: startFactions(), gangStats: startGangStats()
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Porta fiel de validate() da v0.4, com checagens extras de tipo para entradas importadas. */
export function validateRpg(obj: unknown): obj is RpgState {
  if (!isObj(obj)) return false;
  const o = obj as Record<string, unknown>;
  if (o.schema !== 1 || typeof o.name !== 'string' || o.name.length < 2 || o.name.length > 22 || typeof o.city !== 'string' || o.city.length > 40
    || !Array.isArray(o.businesses) || !Array.isArray(o.log) || !isObj(o.stats) || !Number.isInteger(o.day) || (o.day as number) < 1 || (o.day as number) > MAXDAY
    || !Number.isInteger(o.season) || (o.season as number) < 1 || (o.season as number) > 9999) return false;
  for (const k of ['cash', 'bank', 'energy', 'heat', 'respect', 'jail', 'gangLevel', 'successful', 'failed']) {
    const v = o[k];
    if (!Number.isSafeInteger(v) || (v as number) < 0 || (v as number) > 1e12) return false;
  }
  const stats = o.stats as Record<string, unknown>;
  for (const k of ['astucia', 'forca', 'labia', 'influencia']) {
    const v = stats[k];
    if (!Number.isSafeInteger(v) || (v as number) < 1 || (v as number) > 1e7) return false;
  }
  const businesses = o.businesses as unknown[];
  if (!DISTRICTS.some(d => d.id === o.district) || !businesses.every(k => BUSINESSES.some(b => b.id === k)) || new Set(businesses).size !== businesses.length
    || !Array.isArray(o.seasonHistory) || o.seasonHistory.length > 10000) return false;
  // Extra (Marginalidade): o registro precisa ser texto simples, para nunca renderizar dados arbitrários.
  if ((o.log as unknown[]).length > 500 || !(o.log as unknown[]).every(e => isObj(e) && typeof e.msg === 'string' && e.msg.length <= 500 && Number.isInteger(e.day))) return false;
  if (o.gangName !== null && o.gangName !== undefined && (typeof o.gangName !== 'string' || o.gangName.length > 25)) return false;
  return true;
}

const safeInt = (v: unknown): v is number => Number.isSafeInteger(v);

/** Porta fiel de normalizeSave() da v0.4. */
export function normalizeRpg(saved: RpgState): RpgState {
  const base = defaultRpgState(saved.name, saved.city);
  const clean: RpgState = { ...base, ...saved };
  const s = saved as unknown as Record<string, any>;
  clean.career = CAREERS.some(x => x.id === s.career) ? s.career : null;
  clean.goal = GOALS.some(x => x.id === s.goal) ? s.goal : null;
  clean.influence = Object.fromEntries(DISTRICTS.map(d => [d.id, safeInt(s.influence?.[d.id]) ? clamp(s.influence[d.id], 0, 100) : base.influence[d.id]!]));
  clean.rivals = Object.fromEntries(DISTRICTS.map(d => [d.id, safeInt(s.rivals?.[d.id]) ? clamp(s.rivals[d.id], 0, 100) : base.rivals[d.id]!]));
  clean.newsPending = (NEWS.some(n => n.id === s.newsPending?.id) && s.newsPending?.day === saved.day) ? { id: s.newsPending.id, day: saved.day } : null;
  clean.nextBonus = safeInt(s.nextBonus) ? clamp(s.nextBonus, 0, 100000) : 0;
  clean.goalWins = safeInt(s.goalWins) ? clamp(s.goalWins, 0, 9999) : 0;
  const migratedGang = !!clean.gangName;
  clean.crewSize = migratedGang ? (safeInt(s.crewSize) ? clamp(s.crewSize, 2, 8) : 2) : 0;
  clean.crewMorale = migratedGang ? (safeInt(s.crewMorale) ? clamp(s.crewMorale, 0, 100) : 70) : 0;
  clean.crewLastRecruit = safeInt(s.crewLastRecruit) ? clamp(s.crewLastRecruit, 0, MAXDAY) : 0;
  clean.crewLastRally = safeInt(s.crewLastRally) ? clamp(s.crewLastRally, 0, MAXDAY) : 0;
  clean.factions = Object.fromEntries(FACTIONS.map(f => {
    const old = (isObj(s.factions) && isObj(s.factions[f.id]) ? s.factions[f.id] : {}) as Record<string, unknown>;
    const bf = startFactions()[f.id]!;
    return [f.id, {
      relation: safeInt(old.relation) ? clamp(old.relation, -100, 100) : bf.relation,
      tension: safeInt(old.tension) ? clamp(old.tension, 0, 100) : bf.tension,
      truceUntil: safeInt(old.truceUntil) ? clamp(old.truceUntil, 0, MAXDAY) : 0,
      lastActionDay: safeInt(old.lastActionDay) ? clamp(old.lastActionDay, 0, MAXDAY) : 0
    }];
  }));
  clean.gangStats = Object.fromEntries(Object.keys(startGangStats()).map(k => [k, safeInt(s.gangStats?.[k]) ? clamp(s.gangStats[k], 0, 10000) : 0])) as unknown as GangStats;
  // Extras defensivos (Marginalidade): tipos estritos para campos que a v0.4 não validava.
  clean.eventIndex = safeInt(s.eventIndex) ? clamp(s.eventIndex, 0, 5) : 3;
  clean.log = (saved.log || []).slice(0, 35).map(e => ({ day: Number(e.day) || 1, msg: String(e.msg) }));
  clean.seasonHistory = Array.isArray(saved.seasonHistory) ? saved.seasonHistory.filter(isObj).slice(-200) as SeasonRecord[] : [];
  clean.stats = { astucia: saved.stats.astucia, forca: saved.stats.forca, labia: saved.stats.labia, influencia: saved.stats.influencia };
  clean.gangName = typeof saved.gangName === 'string' && saved.gangName.length > 0 ? saved.gangName : null;
  return clean;
}
