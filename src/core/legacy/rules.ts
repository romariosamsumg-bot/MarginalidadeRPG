/**
 * Fórmulas de leitura portadas 1:1 da v0.4 (linhas 232–256 e 408–413).
 * Funções puras: recebem o estado e não o alteram.
 */
import { BUSINESSES, CAREERS, DISTRICTS, EVENTS, FACTIONS, MAXDAY, type FactionDef, type MissionDef, type GoalId } from './data';
import type { RpgState } from './state';
import { clamp } from './util';

export const district = (s: RpgState) => DISTRICTS.find(d => d.id === s.district) || DISTRICTS[0]!;
export const cityEvent = (s: RpgState) => EVENTS[s.eventIndex] || EVENTS[3]!;
export const career = (s: RpgState) => CAREERS.find(c => c.id === s.career) || null;
export const careerBonus = (s: RpgState) => s.career === 'operador' ? 7 : s.career === 'empreendedor' ? -6 : 0;
export const careerHeat = (s: RpgState, heat: number) => Math.ceil(heat * (s.career === 'operador' ? 1.2 : 1));
export const controlled = (s: RpgState, id: string) => (s.influence[id] || 0) >= 60 && (s.influence[id] || 0) >= (s.rivals[id] || 0) + 10;
export const controls = (s: RpgState) => DISTRICTS.filter(d => controlled(s, d.id));
export const factionFor = (id: string): FactionDef => FACTIONS.find(f => f.districts.includes(id)) || FACTIONS[0]!;
export const pactActive = (s: RpgState, id: string) => s.day <= s.factions[id]!.truceUntil;
export const factionStatus = (s: RpgState, id: string) => {
  const rel = s.factions[id]!.relation;
  return pactActive(s, id) ? 'Trégua em vigor' : rel >= 45 ? 'Relações favoráveis' : rel <= -40 ? 'Rivalidade aberta' : rel < 0 ? 'Relações tensas' : 'Neutro';
};
export const groupUpkeep = (s: RpgState) => s.gangName ? s.crewSize * 25 : 0;
export const gangOdds = (s: RpgState) =>
  clamp(Math.round(51 + s.gangLevel * 4 + s.stats.influencia * .8 + s.crewSize * 2.2 + (s.crewMorale - 50) * .16 - s.heat * .35), 16, 91);
export const clashOdds = (s: RpgState, id: string) => {
  const f = factionFor(id), r = s.factions[f.id]!;
  return clamp(Math.round(39 + s.stats.influencia * 1.15 + s.stats.labia * .45 + s.gangLevel * 2.5 + s.crewSize * 1.6 + (s.crewMorale - 50) * .10
    - (s.rivals[id]! - s.influence[id]!) * .23 - s.heat * .18 - r.tension * .08 + (s.career === 'articulador' ? 6 : 0)), 18, 85);
};
export const disputeOdds = (s: RpgState) => {
  const id = s.district, own = s.influence[id]!, rival = s.rivals[id]!, relation = s.factions[factionFor(id).id]!;
  return clamp(Math.round(42 + s.stats.influencia * 1.3 + s.gangLevel * 3 - s.heat * .15 - (rival - own) * .22 + (s.career === 'articulador' ? 6 : 0) - relation.tension * .07), 20, 84);
};
export const dialogueOdds = (s: RpgState, factionId: string) => {
  const f = FACTIONS.find(x => x.id === factionId)!, st = s.factions[factionId]!;
  return clamp(Math.round(64 + s.stats.labia * 1.1 + s.stats.influencia * .35 + st.relation * .12 - st.tension * .22 - f.temperament * .45), 30, 91);
};
export const assetsValue = (s: RpgState) => s.businesses.reduce((t, id) => t + (BUSINESSES.find(b => b.id === id)?.cost || 0), 0);
export const power = (s: RpgState) => s.stats.astucia * 1.7 + s.stats.forca * .8 + s.stats.labia * .45 + s.stats.influencia * .4 + s.gangLevel * 3;
export const chance = (s: RpgState, m: MissionDef) =>
  clamp(Math.round(80 + (power(s) - m.difficulty) * 2 - s.heat * .4 - district(s).risk - cityEvent(s).risk + careerBonus(s)), 12, 96);
export const income = (s: RpgState) =>
  Math.round(s.businesses.reduce((t, id) => t + (BUSINESSES.find(b => b.id === id)?.net || 0), 0) * (s.career === 'empreendedor' ? 1.2 : 1));
export const strength = (s: RpgState) =>
  Math.floor(s.respect + s.stats.astucia + s.stats.forca + s.stats.labia + s.stats.influencia + s.businesses.length * 5 + s.gangLevel * 9);
export const remaining = (s: RpgState) => MAXDAY - s.day;
export const trainCost = (s: RpgState, id: keyof RpgState['stats']) => 280 + s.stats[id] * 38;
export const upgradeCost = (s: RpgState) => 1200 + s.gangLevel * 900;
export const level = (s: RpgState) => clamp(Math.floor(s.respect / 35) + 1, 1, 99);
export const standing = (s: RpgState) => s.respect < 30 ? 'Desconhecido' : s.respect < 85 ? 'Nome em ascensão' : s.respect < 180 ? 'Figura conhecida' : 'Lenda da cidade';

export interface GoalProgress { value: number; max: number; unit: 'currency' | 'percent'; complete: boolean }
export function goalProgress(s: RpgState, id: GoalId | null): GoalProgress {
  if (id === 'capital') return { value: s.cash + s.bank + assetsValue(s), max: 15000, unit: 'currency', complete: s.cash + s.bank + assetsValue(s) >= 15000 };
  if (id === 'renome') return { value: Math.min(135, s.respect) / 135 * 50 + Math.min(25, s.successful) / 25 * 50, max: 100, unit: 'percent', complete: s.respect >= 135 && s.successful >= 25 };
  if (id === 'dominio') {
    const done = controls(s).length >= 1 && DISTRICTS.some(d => !controlled(s, d.id) && s.influence[d.id]! >= 40);
    return {
      value: done ? 100 : Math.min(100, controls(s).length * 60 + DISTRICTS.filter(d => !controlled(s, d.id)).reduce((max, d) => Math.max(max, s.influence[d.id]!), 0)),
      max: 100, unit: 'percent', complete: done
    };
  }
  return { value: 0, max: 100, unit: 'percent', complete: false };
}
