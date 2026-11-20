/**
 * Ações da v0.4 portadas como funções que alteram um RASCUNHO do estado (draft).
 * O store só confirma o rascunho quando `ok === true` — atualização atômica.
 * A ordem das chamadas ao RNG é idêntica à v0.4 (verificada em tests/legacy.rules.test.ts).
 * Textos: mantidos da v0.4; "Você está detido" foi neutralizado para "Você está sob detenção".
 */
import { BUSINESSES, CAREERS, COSTS, DISTRICTS, FACTIONS, GOALS, MAXDAY, MISSIONS, NEWS, SKILLS, type SkillId } from './data';
import {
  assetsValue, careerHeat, chance, clashOdds, controlled, controls, dialogueOdds, disputeOdds, district, cityEvent,
  factionFor, gangOdds, goalProgress, groupUpkeep, income, pactActive, trainCost, upgradeCost
} from './rules';
import { defaultRpgState, type RpgState, type SeasonRecord } from './state';
import { clamp, format, type Rng } from './util';

export interface ActionResult { ok: boolean; msg: string; error?: boolean; data?: Record<string, unknown> }
const ok = (msg: string, data?: Record<string, unknown>): ActionResult => ({ ok: true, msg, data });
const fail = (msg: string): ActionResult => ({ ok: false, msg, error: true });
/** Resultado aplicado mas com notificação de "erro" (ex.: missão fracassada): o estado muda. */
const okBad = (msg: string, data?: Record<string, unknown>): ActionResult => ({ ok: true, msg, error: true, data });

export function log(s: RpgState, msg: string): void {
  s.log.unshift({ day: s.day, msg });
  s.log = s.log.slice(0, 35);
}

const DETAINED = 'Você está sob detenção.';

export function pickCareer(s: RpgState, id: string): ActionResult {
  if (s.career) return fail('A carreira já foi escolhida nesta temporada.');
  const selected = CAREERS.find(c => c.id === id);
  if (!selected) return fail('Especialização inválida.');
  s.career = selected.id;
  log(s, `Você escolheu a especialização ${selected.name}.`);
  return ok(`Carreira definida: ${selected.name}.`);
}

export function newsChoice(s: RpgState, id: string, index: number): ActionResult {
  const news = NEWS.find(n => n.id === id), choice = news?.choices[index];
  if (!news || !choice || s.newsPending?.id !== id || s.newsPending?.day !== s.day) return fail('Notícia indisponível.');
  if (s.jail > 0 || s.energy < choice.energy || s.cash < choice.cash) return fail('Recursos insuficientes para essa escolha.');
  s.energy -= choice.energy; s.cash += choice.money || 0; s.cash -= choice.cash;
  s.respect += choice.respect || 0; s.heat = clamp(s.heat + (choice.heat || 0), 0, 100);
  const boost = Math.round((choice.influence || 0) * (s.career === 'articulador' ? 1.3 : 1));
  s.influence[s.district] = clamp(s.influence[s.district]! + boost, 0, 100);
  s.rivals[s.district] = clamp(s.rivals[s.district]! + (choice.rival || 0), 0, 100);
  s.nextBonus += choice.nextBonus || 0; s.newsPending = null;
  log(s, `${news.name}: ${choice.label}. ${choice.desc}.`);
  return ok('Decisão registrada.');
}

export function skipNews(s: RpgState): ActionResult {
  if (!s.newsPending) return fail('Nenhuma notícia pendente.');
  const title = NEWS.find(n => n.id === s.newsPending!.id)?.name || 'Notícia';
  s.newsPending = null;
  log(s, `${title}: você preferiu não se envolver.`);
  return ok('Notícia encerrada sem custos.');
}

export function influenceAction(s: RpgState, rng: Rng, type: 'contact' | 'dispute'): ActionResult {
  if (s.jail > 0) return fail(DETAINED);
  const id = s.district, own = s.influence[id]!, rival = s.rivals[id]!, isContest = type === 'dispute';
  const energy = isContest ? 33 : 22, cost = isContest ? 320 : 180;
  const fid = factionFor(id).id, relation = s.factions[fid]!;
  if (isContest && own < 20) return fail('Construa pelo menos 20 de influência neste distrito antes de disputar.');
  if (isContest && pactActive(s, fid)) return fail('Há uma trégua ativa com este grupo. Aguarde o término antes de disputar.');
  if (isContest && relation.lastActionDay === s.day) return fail('Você já fez uma ação contra esta facção hoje.');
  if (s.energy < energy || s.cash < cost) return fail('Energia ou dinheiro insuficiente.');
  s.energy -= energy; s.cash -= cost;
  if (!isContest) {
    const boost = Math.round((12 + Math.floor(s.stats.influencia / 10)) * (s.career === 'articulador' ? 1.3 : 1));
    s.influence[id] = clamp(own + boost, 0, 100); s.respect += 2; s.heat = clamp(s.heat + 2, 0, 100);
    log(s, `Contatos fortalecidos em ${district(s).name}: +${boost} de influência local.`);
    return ok(`+${boost} influência em ${district(s).name}.`);
  }
  const odds = disputeOdds(s);
  relation.lastActionDay = s.day;
  relation.relation = clamp(relation.relation - 11, -100, 100);
  relation.tension = clamp(relation.tension + 12, 0, 100);
  if (rng(1, 100) <= odds) {
    s.influence[id] = clamp(own + 17, 0, 100); s.rivals[id] = clamp(rival - 12, 0, 100); s.respect += 6; s.heat = clamp(s.heat + 8, 0, 100);
    log(s, `Disputa vencida em ${district(s).name}. Rivais perderam força.`);
    return ok(`Disputa vencida! Chance: ${odds}%.`, { success: true });
  }
  s.influence[id] = clamp(own - 6, 0, 100); s.rivals[id] = clamp(rival + 9, 0, 100); s.heat = clamp(s.heat + 11, 0, 100);
  log(s, `Disputa perdida em ${district(s).name}. O grupo rival ampliou sua presença.`);
  return okBad('Disputa perdida. O rival avançou.', { success: false });
}

export function factionDialogue(s: RpgState, rng: Rng, id: string): ActionResult {
  const f = FACTIONS.find(x => x.id === id);
  if (!f || !s.gangName || s.jail > 0) return fail('É preciso ter um grupo ativo.');
  const st = s.factions[id]!;
  if (st.lastActionDay === s.day || s.energy < 14 || s.cash < 170) return fail('Diálogo indisponível hoje: verifique energia, dinheiro e limite diário.');
  s.energy -= 14; s.cash -= 170; st.lastActionDay = s.day;
  const odds = dialogueOdds(s, id);
  if (rng(1, 100) <= odds) {
    st.relation = clamp(st.relation + 19, -100, 100); st.tension = clamp(st.tension - 12, 0, 100); s.gangStats.dialogs++;
    log(s, `Conversa com ${f.name}: aproximação bem-sucedida. Relações melhoraram e tensão caiu.`);
    return ok(`Diálogo positivo com ${f.short}!`, { success: true });
  }
  st.relation = clamp(st.relation - 7, -100, 100); st.tension = clamp(st.tension + 5, 0, 100);
  log(s, `Conversa com ${f.name}: não houve acordo e a tensão aumentou.`);
  return okBad('O diálogo não avançou.', { success: false });
}

export function factionPact(s: RpgState, id: string): ActionResult {
  const f = FACTIONS.find(x => x.id === id);
  if (!f || !s.gangName || s.jail > 0) return fail('Ação indisponível.');
  const st = s.factions[id]!;
  if (s.day >= MAXDAY || st.lastActionDay === s.day || pactActive(s, id) || st.relation < 35 || s.energy < 18 || s.cash < 400)
    return fail('Para firmar trégua: relação +35, R$ 400, 18 energia e nenhuma interação com o grupo hoje.');
  s.energy -= 18; s.cash -= 400; st.lastActionDay = s.day; st.truceUntil = Math.min(MAXDAY, s.day + 3);
  st.relation = clamp(st.relation + 3, -100, 100); st.tension = clamp(st.tension - 15, 0, 100); s.gangStats.pacts++;
  log(s, `Trégua com ${f.name} até o dia ${st.truceUntil}: sem disputas ou avanços rivais em seus bairros.`);
  return ok(`Trégua com ${f.short} até o dia ${st.truceUntil}.`);
}

export function factionClash(s: RpgState, rng: Rng, id: string): ActionResult {
  const f = FACTIONS.find(x => x.id === id);
  if (!f || !s.gangName || s.jail > 0) return fail('É necessário liderar seu grupo e estar livre.');
  const st = s.factions[id]!, place = s.district;
  if (!f.districts.includes(place) || s.influence[place]! < 20 || pactActive(s, id) || st.lastActionDay === s.day || s.energy < 32 || s.cash < 300)
    return fail('Confronto indisponível: é preciso estar no bairro, ter 20 de influência e recursos, sem trégua nem ação anterior hoje.');
  const odds = clashOdds(s, place); s.energy -= 32; s.cash -= 300; st.lastActionDay = s.day;
  st.relation = clamp(st.relation - 18, -100, 100); st.tension = clamp(st.tension + 19, 0, 100);
  if (rng(1, 100) <= odds) {
    s.influence[place] = clamp(s.influence[place]! + 16, 0, 100); s.rivals[place] = clamp(s.rivals[place]! - 12, 0, 100);
    s.respect += 6; s.heat = clamp(s.heat + 9, 0, 100); s.crewMorale = clamp(s.crewMorale + 5, 0, 100); s.gangStats.confrontWins++;
    log(s, `${s.gangName} venceu um confronto com ${f.name} em ${district(s).name}; a rivalidade aumentou.`);
    return ok(`Confronto vencido! Chance: ${odds}%.`, { success: true });
  }
  s.influence[place] = clamp(s.influence[place]! - 9, 0, 100); s.rivals[place] = clamp(s.rivals[place]! + 11, 0, 100);
  s.heat = clamp(s.heat + 16, 0, 100); s.crewMorale = clamp(s.crewMorale - 10, 0, 100); s.gangStats.confrontLosses++;
  log(s, `${s.gangName} perdeu o confronto com ${f.name} em ${district(s).name}. A equipe ficou abalada.`);
  return okBad('Confronto perdido: influência e ânimo reduzidos.', { success: false });
}

export function crewRecruit(s: RpgState): ActionResult {
  if (!s.gangName || s.jail > 0 || s.crewSize >= 8 || s.crewLastRecruit === s.day || s.cash < 550 || s.energy < 18) return fail('Recrutamento indisponível agora.');
  s.cash -= 550; s.energy -= 18; s.crewSize++; s.crewMorale = clamp(s.crewMorale + 3, 0, 100); s.crewLastRecruit = s.day;
  log(s, `Sua equipe recebeu um novo integrante. Total: ${s.crewSize}. A manutenção diária aumentou.`);
  return ok(`Equipe com ${s.crewSize} integrantes.`);
}

export function crewRally(s: RpgState): ActionResult {
  if (!s.gangName || s.jail > 0 || s.crewLastRally === s.day || s.crewMorale >= 100 || s.cash < 180 || s.energy < 12) return fail('Reunião indisponível agora.');
  s.cash -= 180; s.energy -= 12; s.crewMorale = clamp(s.crewMorale + 18, 0, 100); s.crewLastRally = s.day;
  log(s, 'A equipe se reuniu e recuperou parte do ânimo.');
  return ok('Ânimo do grupo recuperado.');
}

export function chooseGoal(s: RpgState, id: string): ActionResult {
  if (s.goal || s.day > 5 || !GOALS.some(g => g.id === id)) return fail('Meta não pode mais ser alterada.');
  s.goal = GOALS.find(g => g.id === id)!.id;
  log(s, `Meta escolhida: ${GOALS.find(g => g.id === id)!.name}.`);
  return ok('Meta da temporada definida.');
}

export function legalGig(s: RpgState, rng: Rng): ActionResult {
  if (s.jail > 0 || s.energy < 28) return fail('Você não pode fazer o bico agora.');
  const pay = rng(110, 170);
  s.energy -= 28; s.cash += pay; s.heat = clamp(s.heat - 4, 0, 100);
  log(s, `Bico realizado: ${format(pay)} recebidos, sem aumentar a reputação.`);
  return ok(`Bico concluído. +${format(pay)}`);
}

export function layLow(s: RpgState): ActionResult {
  if (s.jail > 0 || s.energy < 18 || s.heat === 0) return fail('Não é necessário reduzir exposição agora.');
  s.energy -= 18; s.heat = clamp(s.heat - 20, 0, 100);
  log(s, 'Você ficou longe dos holofotes e reduziu a vigilância.');
  return ok('Vigilância reduzida.');
}

export function mission(s: RpgState, rng: Rng, id: string): ActionResult {
  const m = MISSIONS.find(x => x.id === id);
  if (!m) return fail('Missão inexistente.');
  if (s.jail > 0) return fail(DETAINED);
  if (s.respect < m.unlock) return fail('Respeito insuficiente.');
  if (s.energy < m.cost) return fail('Energia insuficiente. Descanse para avançar o dia.');
  const odds = chance(s, m), success = rng(1, 100) <= odds;
  s.energy -= m.cost;
  if (success) {
    const reward = Math.max(1, Math.round(rng(m.low, m.high) * (1 + (district(s).bonus + cityEvent(s).reward + (controlled(s, s.district) ? 12 : 0)) / 100)));
    s.cash += reward; s.respect += m.respect; s.stats.astucia += rng(0, 1); s.heat = clamp(s.heat + careerHeat(s, m.heat), 0, 100); s.successful++;
    log(s, `${m.name}: missão bem-sucedida. Você recebeu ${format(reward)} e ganhou ${m.respect} de respeito.`);
    return ok(`Operação concluída! +${format(reward)}`, { success: true, reward });
  }
  const lost = Math.min(s.cash, Math.ceil(s.cash * .12));
  s.cash -= lost; s.heat = clamp(s.heat + careerHeat(s, m.heat + rng(6, 12)), 0, 100); s.failed++;
  const arrested = rng(1, 100) <= 45 + Math.floor(s.heat * .25);
  if (arrested) s.jail = rng(1, 3);
  log(s, `${m.name}: a missão falhou. Perda de ${format(lost)}.${arrested ? ` Você ficou sob detenção por ${s.jail} dia(s).` : ''}`);
  return okBad(arrested ? 'Missão falhou. Você ficou sob detenção.' : 'Missão falhou. Houve perda de dinheiro.', { success: false, lost, arrested });
}

export function nextDay(s: RpgState, rng: Rng): ActionResult {
  if (s.day >= MAXDAY) return fail('Fim de temporada. Acesse Temporada para encerrar.');
  if (s.newsPending) log(s, 'Você deixou passar uma notícia sem escolher uma ação.');
  s.day++; s.jail = Math.max(0, s.jail - 1);
  const profit = income(s), extra = s.nextBonus;
  s.cash += profit + extra; s.nextBonus = 0;
  s.energy = clamp(s.energy + 70, 0, 100); s.heat = clamp(s.heat - 20, 0, 100);
  s.eventIndex = rng(0, 5);
  let upkeepNote = '';
  if (s.gangName) {
    const cost = groupUpkeep(s);
    if (s.cash >= cost) { s.cash -= cost; s.crewMorale = clamp(s.crewMorale - 2, 0, 100); upkeepNote = ` Equipe: -${format(cost)} e -2 ânimo.`; }
    else { s.crewMorale = clamp(s.crewMorale - 12, 0, 100); upkeepNote = ' Caixa insuficiente para a manutenção: -12 ânimo.'; }
  }
  const rivalDistrict = DISTRICTS[rng(0, DISTRICTS.length - 1)]!.id;
  const movingFaction = factionFor(rivalDistrict), movingState = s.factions[movingFaction.id]!;
  const advance = pactActive(s, movingFaction.id) ? 0 : rng(2, 5) + (movingState.tension >= 65 ? 1 : 0);
  s.rivals[rivalDistrict] = clamp(s.rivals[rivalDistrict]! + advance, 0, 100);
  for (const d of DISTRICTS) if (d.id !== s.district) s.influence[d.id] = clamp(s.influence[d.id]! - 1, 0, 100);
  let retaliation = '';
  // No máximo uma retaliação por dia; nunca ocorre durante uma trégua.
  const hostile = FACTIONS.filter(f => !pactActive(s, f.id) && s.factions[f.id]!.relation <= -40 && s.factions[f.id]!.tension >= 40);
  if (hostile.length) {
    const target = hostile.sort((a, b) => s.factions[b.id]!.tension - s.factions[a.id]!.tension)[0]!;
    if (rng(1, 100) <= Math.min(60, 10 + Math.floor(s.factions[target.id]!.tension * .4))) {
      const districtId = target.districts.slice().sort((a, b) => s.influence[b]! - s.influence[a]!)[0]!;
      const removed = Math.min(6, s.influence[districtId]!);
      s.influence[districtId] = clamp(s.influence[districtId]! - removed, 0, 100);
      s.rivals[districtId] = clamp(s.rivals[districtId]! + 4, 0, 100);
      s.heat = clamp(s.heat + 4, 0, 100); s.gangStats.retaliations++;
      retaliation = ` Retaliação de ${target.name}: -${removed} influência em ${DISTRICTS.find(d => d.id === districtId)!.name}.`;
    }
  }
  s.newsPending = (s.day % 4 === 0) ? { id: NEWS[rng(0, NEWS.length - 1)]!.id, day: s.day } : null;
  log(s, `Novo dia: energia recuperada e vigilância reduzida.${profit ? ` Negócios: ${format(profit)}.` : ''}${extra ? ` Bônus comercial: ${format(extra)}.` : ''}${advance ? ` ${movingFaction.name} avançou em ${DISTRICTS.find(d => d.id === rivalDistrict)!.name}.` : ` Trégua impediu o avanço em ${DISTRICTS.find(d => d.id === rivalDistrict)!.name}.`}${upkeepNote}${retaliation}`);
  return ok(profit || extra ? `Dia ${s.day}: receita total ${format(profit + extra)}.` : `Dia ${s.day} iniciado.`, { profit, extra });
}

export function train(s: RpgState, id: string): ActionResult {
  const skill = SKILLS.find(x => x.id === id);
  if (!skill) return fail('Treino inexistente.');
  const cost = trainCost(s, skill.id);
  if (s.jail > 0 || s.energy < 22 || s.cash < cost) return fail('Você não atende aos requisitos do treinamento.');
  s.energy -= 22; s.cash -= cost; s.stats[skill.id as SkillId] += 2; s.respect += 1;
  log(s, `Treinamento em ${skill.name}: +2 pontos e +1 respeito.`);
  return ok(`${skill.name}: +2 pontos!`);
}

export function travel(s: RpgState, id: string): ActionResult {
  const d = DISTRICTS.find(x => x.id === id);
  if (!d || d.id === s.district) return fail('Destino inválido.');
  if (s.jail > 0 || s.cash < 90 || s.energy < 5) return fail('Não foi possível viajar: verifique dinheiro, energia e detenção.');
  s.cash -= 90; s.energy -= 5; s.district = id;
  log(s, `Você viajou para ${d.name}.`);
  return ok(`Agora você está em ${d.name}.`);
}

export function bank(s: RpgState, mode: 'deposit' | 'withdraw', amount: number): ActionResult {
  if (!Number.isSafeInteger(amount) || amount <= 0) return fail('Digite um valor inteiro maior que zero.');
  if (mode === 'deposit') {
    if (amount > s.cash) return fail('Dinheiro em mãos insuficiente.');
    s.cash -= amount; s.bank += amount; log(s, `Depósito bancário de ${format(amount)}.`);
  } else {
    if (amount > s.bank) return fail('Saldo no banco insuficiente.');
    s.bank -= amount; s.cash += amount; log(s, `Saque bancário de ${format(amount)}.`);
  }
  return ok('Movimentação realizada.');
}

export function buy(s: RpgState, id: string): ActionResult {
  const b = BUSINESSES.find(x => x.id === id);
  if (!b || s.businesses.includes(id) || s.cash < b.cost) return fail('Compra indisponível.');
  s.cash -= b.cost; s.businesses.push(id); s.respect += b.respect;
  log(s, `Você adquiriu ${b.name} por ${format(b.cost)}. Renda diária: ${format(b.net)}.`);
  return ok(`${b.name} adquirido!`);
}

export function sanitizeName(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f<>]/g, '') : '';
}

export function foundGang(s: RpgState, rawName: string): ActionResult {
  const name = sanitizeName(rawName);
  if (!name || name.length < 3 || name.length > 25) return fail('Use um nome entre 3 e 25 caracteres.');
  if (s.gangName || s.respect < 30 || s.cash < 1800) return fail('Requisitos insuficientes.');
  s.cash -= 1800; s.gangName = name; s.gangLevel = 1; s.crewSize = 2; s.crewMorale = 70;
  log(s, `Você fundou a gangue ${name}, com 2 integrantes e ânimo inicial 70.`);
  return ok('Seu grupo foi fundado.');
}

export function upgrade(s: RpgState): ActionResult {
  const cost = upgradeCost(s);
  if (!s.gangName || s.gangLevel >= 8 || s.cash < cost) return fail('Melhoria indisponível.');
  s.cash -= cost; s.gangLevel++; s.respect += 4;
  log(s, `A sede da gangue foi melhorada para o nível ${s.gangLevel}.`);
  return ok('Melhoria concluída!');
}

export function gangMission(s: RpgState, rng: Rng): ActionResult {
  if (!s.gangName || s.jail > 0 || s.energy < 35) return fail('Operação indisponível.');
  s.energy -= 35; const odds = gangOdds(s);
  if (rng(1, 100) <= odds) {
    const reward = rng(700, 1450); s.cash += reward; s.respect += 6; s.heat = clamp(s.heat + 16, 0, 100);
    s.crewMorale = clamp(s.crewMorale + 3, 0, 100); s.successful++; s.gangStats.groupWins++;
    log(s, `Operação de ${s.gangName} concluída: ${format(reward)} recebidos e ânimo da equipe melhorado.`);
    return ok(`Operação em grupo concluída! +${format(reward)}`, { success: true, reward });
  }
  const lost = Math.ceil(s.cash * .08); s.cash -= lost; s.failed++; s.heat = clamp(s.heat + 22, 0, 100);
  s.crewMorale = clamp(s.crewMorale - 8, 0, 100);
  log(s, `Operação de ${s.gangName} falhou. Perda: ${format(lost)}; a equipe perdeu ânimo.`);
  return okBad('A operação em grupo falhou.', { success: false, lost });
}

export function seasonSummary(s: RpgState) {
  const money = s.cash + s.bank, fulfilled = s.goal ? goalProgress(s, s.goal).complete : false;
  const record: SeasonRecord = {
    season: s.season, respect: s.respect, money, success: s.successful, failed: s.failed, goal: s.goal, goalComplete: fulfilled,
    career: s.career, districts: controls(s).length, gangName: s.gangName, confrontWins: s.gangStats.confrontWins,
    confrontLosses: s.gangStats.confrontLosses, pacts: s.gangStats.pacts, groupWins: s.gangStats.groupWins
  };
  return { money, fulfilled, record };
}

/** endSeason() da v0.4 sem o confirm(): a confirmação fica na UI. Retorna o NOVO estado. */
export function endSeason(s: RpgState): { result: ActionResult; next: RpgState | null } {
  if (s.day !== MAXDAY) return { result: fail('A temporada só pode ser encerrada no último dia.'), next: null };
  const { money, fulfilled, record } = seasonSummary(s);
  const n = defaultRpgState(s.name, s.city);
  n.season = s.season + 1;
  n.seasonHistory = [...s.seasonHistory, record];
  n.goalWins = s.goalWins + (fulfilled ? 1 : 0);
  n.cash = 1900 + Math.min(1200, Math.floor(money * .05)) + (fulfilled ? 600 : 0);
  n.log = [{ day: 1, msg: `Nova temporada iniciada. Legado anterior: ${record.respect} de respeito; meta ${fulfilled ? 'concluída' : 'não concluída'}. Você pode escolher nova especialização e meta.` }];
  return { result: ok(fulfilled ? 'Nova temporada! Meta recompensada.' : 'Nova temporada iniciada!'), next: n };
}

/** Recompensa narrativa de respeito: passa pelo núcleo e é registrada no histórico. */
export function grantRespect(s: RpgState, amount: number, reason: string): void {
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 50) return;
  s.respect += amount;
  log(s, `${reason} (+${amount} respeito)`);
}

export { assetsValue, COSTS };
