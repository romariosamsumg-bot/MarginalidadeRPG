/**
 * Executa o JavaScript ORIGINAL de reference/submundo-brasil-v0.4/Submundo-Brasil-v0.4.html
 * dentro de um jsdom isolado (somente em teste), expondo as funções internas.
 * O arquivo de referência não é modificado: as substituições ocorrem numa cópia em memória.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import type { Rng } from '../src/core/legacy/util';

export const REFERENCE_HTML = resolve(__dirname, '../reference/submundo-brasil-v0.4/Submundo-Brasil-v0.4.html');

export interface LegacyApi {
  state: any;
  [fn: string]: any;
}

export function loadLegacy(rng: Rng): { api: LegacyApi; window: any } {
  let html = readFileSync(REFERENCE_HTML, 'utf8');
  const randRe = /const rand=\(min,max\)=>\{[^\n]*?\};/;
  if (!randRe.test(html)) throw new Error('Assinatura de rand() não encontrada na referência');
  html = html.replace(randRe, 'const rand=(min,max)=>globalThis.__rand(min,max);');
  const hook = "globalThis.__legacy={get state(){return state},set state(v){state=v},chance,power,income,strength,gangOdds,clashOdds,mission,nextDay,train,travel,bank,buy,foundGang,upgrade,gangMission,factionDialogue,factionPact,factionClash,crewRecruit,crewRally,legalGig,layLow,influenceAction,newsChoice,skipNews,pickCareer,chooseGoal,endSeason,goalProgress,defaultState,validate,normalizeSave};\n    state=read();";
  if (!html.includes('state=read();if(state)render()')) throw new Error('Ponto de inicialização não encontrado na referência');
  html = html.replace('state=read();if(state)render()', hook + 'if(state)render()');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://legacy.invalid/',
    beforeParse(w: any) {
      w.__rand = rng;
      w.confirm = () => true;
      w.scrollTo = () => {};
    }
  });
  const w = dom.window as any;
  return { api: w.__legacy as LegacyApi, window: w };
}
