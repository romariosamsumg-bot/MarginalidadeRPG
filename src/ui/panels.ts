/**
 * Painéis de RPG. Port das seis telas da v0.4 (painel, ações, cidade, gestão, gangue, temporada)
 * + História (campanha) + Ajustes. Mesmas regras de habilitação de botões da v0.4.
 * Strings dinâmicas sempre passam por esc().
 */
import { BUSINESSES, CAREERS, DISTRICTS, FACTIONS, GOALS, HOME_CITIES, MAXDAY, MISSIONS, NEWS, SKILLS } from '../core/legacy/data';
import * as R from '../core/legacy/rules';
import { clamp, format, num } from '../core/legacy/util';
import type { GameState } from '../core/state';
import { CAMPAIGN, currentObjective } from '../narrative/content/campaign';
import type { PanelId } from '../narrative/types';
import type { RpgState } from '../core/legacy/state';
import { btn, esc } from './dom';

export const TABS: Array<{ id: PanelId; label: string }> = [
  { id: 'resumo', label: 'Início' },
  { id: 'historia', label: 'História' },
  { id: 'missoes', label: 'Missões' },
  { id: 'cidade', label: 'Cidade' },
  { id: 'economia', label: 'Economia' },
  { id: 'gangue', label: 'Gangue' },
  { id: 'temporada', label: 'Temporada' },
  { id: 'ajustes', label: 'Ajustes' }
];

const head = (s: RpgState, title: string, desc: string) =>
  `<div class="eyebrow">Temporada ${s.season} · Dia ${s.day} de ${MAXDAY}</div><h1>${title}</h1><p class="lead">${desc}</p>`;

const jail = (s: RpgState) => s.jail > 0 ? `<div class="notice error"><strong>Você está sob detenção.</strong> Faltam ${s.jail} dia(s). Descanse em casa para avançar o calendário: missões e treinamentos ficam bloqueados.</div>` : '';

const journal = (s: RpgState, max = 5) =>
  `<ul class="timeline">${s.log.slice(0, max).map(i => `<li><time>Dia ${i.day}</time>${esc(i.msg)}</li>`).join('')}</ul>`;

const bars = (s: RpgState) =>
  `<div class="meterlabel"><span>Energia</span><strong>${s.energy}/100</strong></div><div class="meter green"><div style="width:${s.energy}%"></div></div>
   <div class="meterlabel"><span>Pressão policial</span><strong>${s.heat}/100</strong></div><div class="meter red"><div style="width:${s.heat}%"></div></div>`;

function careerCard(s: RpgState) {
  const c = R.career(s);
  if (c) return `<div class="notice ok"><strong>Especialização: ${esc(c.name)}</strong> — ${esc(c.desc)}</div>`;
  return `<section class="box"><div class="eyebrow">Decisão permanente nesta temporada</div><h2>Escolha seu estilo de carreira</h2><p>Cada caminho tem vantagens e desvantagens. Você poderá escolher novamente na próxima temporada.</p>
    <div class="choiceGrid">${CAREERS.map(c => `<article><strong>${c.name}</strong><p class="mini">${c.desc}</p>${btn('Escolher ' + c.name, 'career', `data-id="${c.id}"`, false, 'small primary block')}</article>`).join('')}</div></section>`;
}

function goalSummary(s: RpgState) {
  if (!s.goal) return '';
  const g = GOALS.find(x => x.id === s.goal)!, p = R.goalProgress(s, s.goal);
  return `<div class="notice"><strong>Meta: ${g.name}</strong> — ${p.complete ? 'Concluída!' : p.unit === 'currency' ? format(p.value) + ' / ' + format(p.max) : Math.round(p.value) + '% do objetivo'}</div>`;
}

function newsCard(s: RpgState) {
  if (!s.newsPending) return '';
  const news = NEWS.find(n => n.id === s.newsPending!.id);
  if (!news) return '';
  return `<section class="box"><div class="eyebrow">Decisão da cidade · Dia ${s.day}</div><h2>${news.name}</h2><p>${news.desc}</p>
    <div class="choiceGrid">${news.choices.map((c, i) => `<article><strong>${c.label}</strong><p class="mini">${c.desc}</p>${btn('Tomar decisão', 'news', `data-id="${news.id}" data-choice="${i}"`, s.cash < c.cash || s.energy < c.energy || s.jail > 0, 'small block')}</article>`).join('')}</div>
    <div style="margin-top:8px">${btn('Ignorar notícia', 'skip-news', '', false, 'ghost small')}</div></section>`;
}

function resumo(g: GameState) {
  const s = g.rpg;
  const unlocked = MISSIONS.filter(m => s.respect >= m.unlock).sort((a, b) => b.low - a.low);
  const feature = unlocked.find(m => R.chance(s, m) >= 55 && s.energy >= m.cost) || unlocked.find(m => s.energy >= m.cost) || unlocked[0];
  const canAct = !!feature && s.energy >= feature.cost && s.jail === 0;
  const obj = currentObjective(g.story);
  return jail(s) + `
  <div class="eyebrow">Temporada ${s.season} · Dia ${s.day} de ${MAXDAY}</div>
  <h1>${esc(s.name)}</h1>
  <p class="lead">Natural ${s.city === 'Rio de Janeiro' || s.city === 'Recife' ? 'do' : 'de'} ${esc(s.city)} · mora na Vila do Dique (Rio de Janeiro) · atua em ${esc(R.district(s).name)} · ${R.standing(s)} · Nível ${R.level(s)}</p>
  <div class="stats">
    <div class="stat"><span>Em mãos</span><strong>${format(s.cash)}</strong></div>
    <div class="stat"><span>Banco</span><strong>${format(s.bank)}</strong></div>
    <div class="stat"><span>Respeito</span><strong>${num(s.respect)}</strong></div>
    <div class="stat"><span>Poder total</span><strong>${num(R.strength(s))}</strong></div>
  </div>
  <section class="box" style="margin-top:10px">${bars(s)}<div class="row" style="margin-top:10px"><span class="mini">${s.jail > 0 ? 'Sob detenção por ' + s.jail + ' dia(s)' : 'Descansar recupera 70 de energia e reduz 20 de pressão.'}</span>${btn(s.day === MAXDAY ? 'Finalizar temporada' : 'Descansar · avançar dia', s.day === MAXDAY ? 'tab' : 'next-day', s.day === MAXDAY ? 'data-tab="temporada"' : '', false, 'primary small')}</div></section>
  ${obj ? `<div class="notice" style="margin-top:10px"><strong>${esc(obj.missionId)} · ${esc(obj.title)}</strong> — ${esc(obj.objective)}</div>` : ''}
  ${careerCard(s)}${goalSummary(s)}${newsCard(s)}
  <div class="grid two" style="margin-top:10px">
    <section class="box"><div class="eyebrow">Sua próxima decisão</div><h2>${feature ? esc(feature.name) : 'Explorar oportunidades'}</h2><p>${feature ? esc(feature.desc) : ''}</p>
      ${feature ? `<div class="row mini"><span>Chance ${R.chance(s, feature)}%</span><span>Ganhos ${format(feature.low)}+</span><span>Energia ${feature.cost}</span></div><div style="margin-top:8px">${btn(!canAct ? (s.jail ? 'Ação indisponível' : 'Sem energia') : 'Executar missão', 'mission', `data-id="${feature.id}"`, !canAct, 'primary block')}</div>` : ''}</section>
    <section class="box"><div class="eyebrow">Boletim da cidade</div><h2>${esc(R.cityEvent(s).title)}</h2><p>${esc(R.cityEvent(s).desc)}</p>
      <div class="row mini"><span>Renda dos negócios</span><strong>${format(R.income(s))} / dia</strong></div>
      <div class="row mini"><span>Influência local</span><strong>${s.influence[s.district]} / 100 · rival ${s.rivals[s.district]} / 100</strong></div></section>
  </div>
  <div class="section"><h2>Últimos acontecimentos</h2><small>Registro da carreira</small></div><section class="box">${journal(s, 4)}</section>`;
}

const RELATION_LABEL: Record<string, string> = { neutro: 'Neutra', confianca: 'Confiança', distancia: 'Distância', conflito: 'Conflito', rompimento: 'Rompimento' };
const NPC_NAMES: Record<string, string> = { magrao: 'Breno “Magrão”', lia: 'Lia', solange: 'Dona Solange', miro: 'Miro Ferrugem', nando: 'Nando', ze: 'Seu Zé' };

function historia(g: GameState) {
  const st = g.story, obj = currentObjective(st);
  const metNpc = (id: string) => id === 'magrao' || id === 'lia' || (id === 'solange') || (id === 'nando') || (id === 'miro' && st.flags['miro_met'] === true) || (id === 'ze');
  return `<div class="eyebrow">Campanha</div><h1>O Preço do Poder</h1>
  <p class="lead">Ato ${st.act} · ${esc(st.clock.label)}. A história tem seu próprio relógio; a temporada de 30 dias da carreira continua em paralelo.</p>
  ${obj ? `<section class="box"><div class="eyebrow">Missão atual</div><h2>${esc(obj.missionId)} — ${esc(obj.title)}</h2><p>${esc(obj.objective)}</p></section>` : ''}
  <div class="section"><h2>Atos e missões</h2><small>Conteúdo futuro aparece marcado como “em produção”</small></div>
  ${CAMPAIGN.map(a => `<div class="act box"><h3>Ato ${a.act} — ${esc(a.title)}</h3><p class="mini">${esc(a.theme)}</p>
    ${a.missions.map(m => {
      const status = st.missions[m.id]?.status;
      const pill = !m.implemented ? '<span class="pill future">Em produção</span>' : status === 'completed' ? '<span class="pill done">Concluída</span>' : status === 'active' ? '<span class="pill">Em andamento</span>' : '<span class="pill future">Bloqueada</span>';
      return `<div class="mrow"><div><strong>${m.id} · ${esc(m.title)}</strong><p>${esc(m.summary)}</p></div>${pill}</div>`;
    }).join('')}</div>`).join('')}
  <div class="section"><h2>Decisões que você tomou</h2><small>${st.choices.length} registrada(s)</small></div>
  <section class="box">${st.choices.length ? `<ul class="timeline">${st.choices.slice().reverse().map(c => `<li><time>${esc(c.storyLabel || 'História')}</time>${esc(c.memory)}</li>`).join('')}</ul>` : '<p>Nenhuma decisão importante ainda.</p>'}</section>
  <div class="section"><h2>Pessoas</h2><small>Relações mudam com suas escolhas</small></div>
  <div class="grid two">${Object.entries(st.relationships).filter(([id]) => metNpc(id)).map(([id, r]) => `<div class="box row"><strong>${NPC_NAMES[id] ?? esc(id)}</strong><span class="pill">${RELATION_LABEL[r.state] ?? esc(r.state)}</span></div>`).join('')}</div>`;
}

function safeJobs(s: RpgState) {
  return `<div class="section"><h2>Outras escolhas</h2><small>Menos risco, menor retorno</small></div>
  <div class="grid two">
    <section class="box"><h3>Bico de ocasião</h3><p>Trabalho simples e garantido, sem aumentar sua reputação. Bom para preservar o caixa.</p><div class="row"><span class="mini">28 energia · R$ 110–170 · -4 pressão</span>${btn('Fazer bico', 'gig', '', s.energy < 28 || s.jail > 0, 'small')}</div></section>
    <section class="box"><h3>Ficar na sua</h3><p>Evite movimentações e reduza a atenção sobre você. Gasta energia e não rende dinheiro.</p><div class="row"><span class="mini">18 energia · -20 pressão</span>${btn('Reduzir exposição', 'laylow', '', s.energy < 18 || s.jail > 0 || s.heat === 0, 'small')}</div></section>
  </div>
  <div class="notice" style="margin-top:9px">Nas missões de risco, uma falha pode causar perda de dinheiro em mãos, aumentar a pressão e resultar em detenção. Depósitos bancários não sofrem essas perdas. Atividades são abstratas: o jogo não descreve procedimentos reais.</div>`;
}

function missoes(g: GameState) {
  const s = g.rpg;
  return head(s, 'Missões e treinamento', 'Mural da Praça da Passarela. Resultados dependem dos seus atributos e do risco da cidade.') + jail(s) + safeJobs(s) + `
  <div class="grid two" style="margin-top:10px"><section class="box">${bars(s)}</section>
  <section class="box"><div class="row"><h2>Condições atuais</h2><span class="pill">${esc(R.district(s).name)}</span></div><p>${esc(R.cityEvent(s).desc)}</p><div class="row"><span class="mini">Seu poder de operação</span><strong>${num(R.power(s))}</strong></div></section></div>
  <div class="section"><h2>Missões individuais</h2><small>Chance máxima: 96%</small></div>
  <div class="grid">${MISSIONS.map(m => {
    const unlocked = s.respect >= m.unlock, p = R.chance(s, m), blocked = s.jail > 0 || s.energy < m.cost || !unlocked;
    return `<section class="box mission"><div><h3>${esc(m.name)} ${unlocked ? '' : `<span class="pill">Requer ${m.unlock} respeito</span>`}</h3><p>${esc(m.desc)}</p><div class="mini">${m.cost} energia · ${format(m.low)}–${format(m.high)} · ${m.heat} pressão</div></div>
      <div><span class="chance ${p < 55 ? 'danger' : p < 78 ? 'risky' : ''}">${p}% <small class="mini">sucesso</small></span>${btn('Executar', 'mission', `data-id="${m.id}"`, blocked, 'primary small')}</div></section>`;
  }).join('')}</div>
  <div class="section"><h2>Centro de treinamento</h2><small>Custo em dinheiro e energia</small></div>
  <div class="grid two">${SKILLS.map(k => {
    const lv = s.stats[k.id], cost = R.trainCost(s, k.id);
    return `<section class="box"><div class="row"><h3>${k.name}</h3><strong style="color:var(--amber2)">${num(lv)}</strong></div><p>${k.desc}</p><div class="row"><span class="mini">+2 pontos · 22 energia · ${format(cost)}</span>${btn('Treinar', 'train', `data-id="${k.id}"`, s.jail > 0 || s.energy < 22 || s.cash < cost, 'small')}</div></section>`;
  }).join('')}</div>`;
}

function cidade(g: GameState) {
  const s = g.rpg, d = R.district(s), f = R.factionFor(s.district);
  const fs = s.factions[f.id]!;
  return head(s, 'Cidade e distritos', 'Ponto da Linha 314. Distritos fictícios com diferenças reais de risco e recompensa.') + `
  <section class="box"><div class="row"><div><h2>Influência em ${esc(d.name)}</h2><p>O rival principal é ${f.name}. ${R.factionStatus(s, f.id)}. Liderar o distrito concede +12% nas missões feitas aqui.</p></div>${R.controlled(s, s.district) ? '<span class="pill">Distrito liderado</span>' : ''}</div>
    <div class="grid two"><div><div class="meterlabel"><span>Sua influência</span><strong>${s.influence[s.district]}%</strong></div><div class="meter green"><div style="width:${s.influence[s.district]}%"></div></div></div>
    <div><div class="meterlabel"><span>Rivais simulados</span><strong>${s.rivals[s.district]}%</strong></div><div class="meter red"><div style="width:${s.rivals[s.district]}%"></div></div></div></div>
    <div class="row" style="margin-top:12px;justify-content:flex-start">${btn('Criar contatos · R$ 180', 'influence', 'data-id="contact"', s.jail > 0 || s.cash < 180 || s.energy < 22, 'small primary')}${btn('Disputar área · R$ 320', 'influence', 'data-id="dispute"', s.jail > 0 || s.cash < 320 || s.energy < 33 || s.influence[s.district]! < 20 || R.pactActive(s, f.id) || fs.lastActionDay === s.day, 'small')}</div>
    <p class="mini">Criar contatos: 22 energia, influência garantida. Disputa: 33 energia, uma por facção ao dia, bloqueada em tréguas. Grupos são fictícios.</p></section>
  <div class="section"><h2>Quadro de bairros</h2><small>${R.controls(s).length} distrito(s) liderado(s)</small></div>
  <div class="grid two">${DISTRICTS.map(x => `<div class="box row"><strong>${esc(x.name)}</strong><span class="mini">${R.controlled(s, x.id) ? 'Você lidera' : `Você ${s.influence[x.id]} · ${R.factionFor(x.id).short} ${s.rivals[x.id]}`}</span></div>`).join('')}</div>
  <div class="section"><h2>Distritos de atuação</h2><small>Viagem: ${format(90)} e 5 energia</small></div>
  <div class="grid two">${DISTRICTS.map(x => `<section class="box"><div class="row"><h3>${esc(x.name)}</h3>${x.id === s.district ? '<span class="pill">Local atual</span>' : ''}</div><p>${esc(x.desc)}</p><div class="row"><span class="mini">${x.bonus >= 0 ? '+' : ''}${x.bonus}% retorno · risco ${x.risk >= 0 ? '+' : ''}${x.risk}</span>${x.id === s.district ? '' : btn('Viajar', 'travel', `data-id="${x.id}"`, s.cash < 90 || s.energy < 5 || s.jail > 0, 'small')}</div></section>`).join('')}</div>
  <div class="section"><h2>Brasil</h2><small>As seis cidades do jogo-base</small></div>
  <div class="grid two">${HOME_CITIES.map(c => `<div class="box row"><div><strong>${esc(c)}</strong><div class="mini">${c === 'Rio de Janeiro' ? 'Localização atual — Vila do Dique' : 'Ato III: Fora de Casa (conteúdo futuro)'}${c === s.city ? ' · sua cidade natal' : ''}</div></div>${c === 'Rio de Janeiro' ? '<span class="pill done">Aqui</span>' : '<span class="pill future">Em produção</span>'}</div>`).join('')}</div>
  <p class="mini" style="margin-top:12px">Os distritos, bairros e personagens são inventados. Não representam criminalidade em bairros ou comunidades reais.</p>`;
}

function economia(g: GameState) {
  const s = g.rpg, invested = R.assetsValue(s);
  return head(s, 'Banco e negócios', 'Correspondente bancário da Mercearia da Solange e o ponto comercial da rua.') + jail(s) + `
  <div class="stats"><div class="stat"><span>Em mãos</span><strong>${format(s.cash)}</strong></div><div class="stat"><span>Banco</span><strong>${format(s.bank)}</strong></div><div class="stat"><span>Respeito</span><strong>${num(s.respect)}</strong></div><div class="stat"><span>Poder total</span><strong>${num(R.strength(s))}</strong></div></div>
  <div class="grid two" style="margin-top:10px">
    <section class="box"><h2>Banco</h2><p>Dinheiro depositado não sofre as perdas de operações malsucedidas.</p>
      <label class="mini" for="bankAmount">Valor em reais (R$)</label><input class="input" id="bankAmount" type="number" min="1" step="1" inputmode="numeric" placeholder="Ex.: 500">
      <div class="row" style="margin-top:8px;justify-content:flex-start">${btn('Depositar', 'bank', 'data-mode="deposit"', false, 'primary small')}${btn('Sacar', 'bank', 'data-mode="withdraw"', false, 'small')}</div></section>
    <section class="box"><h2>Seu patrimônio</h2><table class="table"><tbody>
      <tr><td>Dinheiro em mãos</td><td>${format(s.cash)}</td></tr><tr><td>Banco</td><td>${format(s.bank)}</td></tr>
      <tr><td>Valor investido</td><td>${format(invested)}</td></tr><tr><td><strong>Patrimônio total</strong></td><td><strong>${format(s.cash + s.bank + invested)}</strong></td></tr></tbody></table>
      <div class="row" style="margin-top:8px"><span>Renda por dia</span><strong style="color:var(--green)">${format(R.income(s))}</strong></div></section>
  </div>
  <div class="section"><h2>Estabelecimentos</h2><small>Recebimento ao avançar o dia</small></div>
  <div class="grid two">${BUSINESSES.map(b => {
    const owned = s.businesses.includes(b.id);
    return `<section class="box"><div class="row"><h3>${b.name}</h3>${owned ? '<span class="pill done">Adquirido</span>' : ''}</div><p>${b.desc}</p>
      <table class="table"><tbody><tr><td>Compra</td><td>${format(b.cost)}</td></tr><tr><td>Lucro líquido / dia</td><td style="color:var(--green)">${format(b.net)}</td></tr><tr><td>Respeito na compra</td><td>+${b.respect}</td></tr></tbody></table>
      <div style="margin-top:8px">${btn(owned ? 'Seu estabelecimento' : 'Comprar negócio', 'buy', `data-id="${b.id}"`, owned || s.cash < b.cost, 'block small ' + (owned ? 'ghost' : 'primary'))}</div></section>`;
  }).join('')}</div>
  <p class="mini" style="margin-top:12px">O último negócio adquirido ocupa o ponto comercial vazio da Vila do Dique. Valores herdados da v0.4, sem rebalanceamento.</p>`;
}

function factionCard(s: RpgState, f: (typeof FACTIONS)[number]) {
  const st = s.factions[f.id]!, active = R.pactActive(s, f.id), used = st.lastActionDay === s.day;
  const areas = f.districts.map(id => DISTRICTS.find(d => d.id === id)?.name).join(' e ');
  const inArea = f.districts.includes(s.district), canAct = !!s.gangName && s.jail === 0 && !used;
  return `<section class="box"><div class="row"><div><div class="eyebrow">Grupo fictício · ${esc(areas)}</div><h3>${f.name}</h3></div><span class="pill">${R.factionStatus(s, f.id)}</span></div><p>${f.desc}</p>
    <div class="row mini"><span>Relação ${st.relation > 0 ? '+' : ''}${st.relation}</span><span>Tensão ${st.tension}/100</span><span>Trégua ${active ? `até dia ${st.truceUntil}` : 'não'}</span></div>
    <div class="row" style="margin-top:8px;justify-content:flex-start">${btn('Dialogar · R$ 170', 'f-dialogue', `data-id="${f.id}"`, !canAct || s.cash < 170 || s.energy < 14, 'small')}${btn('Negociar trégua · R$ 400', 'f-pact', `data-id="${f.id}"`, !canAct || active || st.relation < 35 || s.cash < 400 || s.energy < 18 || s.day >= MAXDAY, 'small')}${btn('Confrontar no bairro · R$ 300', 'f-clash', `data-id="${f.id}"`, !canAct || active || !inArea || s.influence[s.district]! < 20 || s.cash < 300 || s.energy < 32, 'small danger')}</div>
    <p class="mini">${used ? 'Ação diária utilizada com este grupo.' : active ? 'A trégua bloqueia confrontos, mas protege contra avanços e retaliações.' : 'O diálogo pode reduzir a tensão. Para uma trégua, alcance relação +35. O confronto é uma disputa abstrata de influência e exige 20 de influência no bairro.'}</p></section>`;
}

function gangue(g: GameState) {
  const s = g.rpg, created = !!s.gangName, up = R.upgradeCost(s);
  const group = created ? `<section class="box"><div class="eyebrow">Seu grupo</div><h2>${esc(s.gangName)}</h2><p>Uma equipe simulada com custos, disposição e capacidade de negociação.</p><div class="row mini" style="justify-content:flex-start;gap:14px"><span>Sede nível ${s.gangLevel}</span><span>${s.crewSize} integrantes</span><span>Ânimo ${s.crewMorale}/100</span></div></section>
    <div class="grid two" style="margin-top:10px">
      <section class="box"><h2>Equipe e manutenção</h2><p>Manutenção diária: ${format(R.groupUpkeep(s))}. Sem dinheiro em mãos, o ânimo cai mais depressa.</p>
        <div class="row mini"><span>Recrutar +1 integrante</span><strong>${format(550)} · 18 energia</strong></div>${btn('Recrutar', 'recruit', '', s.crewSize >= 8 || s.crewLastRecruit === s.day || s.cash < 550 || s.energy < 18 || s.jail > 0, 'block small')}
        <div class="row mini" style="margin-top:8px"><span>Reunir equipe (+18 ânimo)</span><strong>${format(180)} · 12 energia</strong></div>${btn('Reunir equipe', 'rally', '', s.crewLastRally === s.day || s.crewMorale >= 100 || s.cash < 180 || s.energy < 12 || s.jail > 0, 'block small')}</section>
      <section class="box"><h2>Operações do grupo</h2><p>A chance depende do tamanho, ânimo, sede, atributos e pressão.</p>
        <div class="row mini"><span>Operação coletiva · 35 energia</span><strong>${R.gangOdds(s)}% de sucesso</strong></div>${btn('Organizar operação', 'gang-mission', '', s.jail > 0 || s.energy < 35, 'primary block small')}
        <div class="row mini" style="margin-top:8px"><span>Melhorar a sede</span><strong>${format(up)}</strong></div>${btn('Melhorar sede', 'upgrade', '', s.cash < up || s.gangLevel >= 8, 'block small')}</section>
    </div>`
    : `<section class="box"><div class="eyebrow">Comece sua história</div><h2>Nenhum grupo fundado</h2><p>Requisitos: 30 de respeito e ${format(1800)} em mãos. Você começa com dois integrantes.</p>
      <label class="mini" for="gangName">Nome do grupo (fictício)</label><input id="gangName" class="input" maxlength="25" placeholder="Nome fictício do seu grupo" autocomplete="off">
      <div style="margin-top:10px">${btn('Fundar grupo', 'found-gang', '', s.respect < 30 || s.cash < 1800, 'primary')}</div></section>`;
  return head(s, 'Gangue e rivalidades', 'Conversas no Bar do Nando. Negocie, fortaleça sua equipe ou dispute influência com grupos simulados.') + group + `
  <div class="section"><h2>Grupos da cidade</h2><small>Uma interação por grupo a cada dia virtual</small></div>
  <section class="box"><div class="row"><h2>Disputa na cidade</h2><span class="pill">${s.gangStats.confrontWins} vitórias · ${s.gangStats.confrontLosses} derrotas</span></div><div class="row mini"><span>Acordos firmados: ${s.gangStats.pacts}</span><span>Reações rivais: ${s.gangStats.retaliations}</span><span>Seus bairros: ${R.controls(s).length}/${DISTRICTS.length}</span></div></section>
  <div class="grid two" style="margin-top:10px">${FACTIONS.map(f => factionCard(s, f)).join('')}</div>
  <div class="notice" style="margin-top:10px">Simulação individual: não existem outros jogadores, chat, alianças online nem guerra multiplayer nesta versão.</div>`;
}

function goalCard(s: RpgState) {
  if (!s.goal) {
    if (s.day > 5) return `<section class="box"><h2>Meta da temporada</h2><p>Você não escolheu uma meta nos primeiros cinco dias. Poderá selecionar uma na próxima temporada.</p></section>`;
    return `<section class="box"><h2>Escolha a meta da temporada</h2><p>Defina até o dia 5 o que quer conquistar. Cumprir a meta garante R$ 600 adicionais na próxima temporada.</p><div class="choiceGrid">${GOALS.map(gl => `<article><strong>${gl.name}</strong><p class="mini">${gl.desc}</p>${btn('Escolher meta', 'goal', `data-id="${gl.id}"`, false, 'small block')}</article>`).join('')}</div></section>`;
  }
  const gl = GOALS.find(x => x.id === s.goal)!, p = R.goalProgress(s, s.goal), v = p.unit === 'currency' ? format(p.value) : `${Math.round(p.value)}%`;
  return `<section class="box"><div class="row"><div><div class="eyebrow">Sua meta de temporada</div><h2>${gl.name}</h2></div><span class="pill">${p.complete ? 'Concluída' : 'Em andamento'}</span></div><p>${gl.desc}</p><div class="meter green"><div style="width:${clamp(p.value / p.max * 100, 0, 100)}%"></div></div><div class="row mini" style="margin-top:6px"><span>Progresso: ${v}</span><strong>${p.complete ? 'Bônus garantido ao encerrar' : 'Bônus: R$ 600'}</strong></div></section>`;
}

function temporada(g: GameState) {
  const s = g.rpg;
  return head(s, 'Temporada', 'Sua casa: descansar avança o dia. Trinta dias de carreira por temporada; a campanha continua entre temporadas.') + goalCard(s) + `
  <div class="grid two" style="margin-top:10px">
    <section class="box"><div class="eyebrow">Temporada atual</div><div style="font:900 2.2em var(--serif);color:var(--amber)">${String(s.season).padStart(2, '0')}</div><div class="meter"><div style="width:${s.day / MAXDAY * 100}%"></div></div><div class="row mini" style="margin-top:6px"><span>Dia ${s.day} de ${MAXDAY}</span><strong>${R.remaining(s)} dias restantes</strong></div>
      <div style="margin-top:12px">${btn(s.day === MAXDAY ? 'Encerrar temporada' : 'Descansar · avançar um dia', s.day === MAXDAY ? 'end-season' : 'next-day', '', false, 'primary block')}</div></section>
    <section class="box"><h2>Resumo da carreira</h2><table class="table"><tbody>
      <tr><td>Missões concluídas</td><td>${num(s.successful)}</td></tr><tr><td>Missões fracassadas</td><td>${num(s.failed)}</td></tr><tr><td>Respeito</td><td>${num(s.respect)}</td></tr>
      <tr><td>Negócios</td><td>${s.businesses.length}</td></tr><tr><td>Confrontos vencidos</td><td>${s.gangStats.confrontWins}</td></tr><tr><td>Tréguas</td><td>${s.gangStats.pacts}</td></tr><tr><td>Patrimônio disponível</td><td>${format(s.cash + s.bank)}</td></tr></tbody></table></section>
  </div>
  <div class="section"><h2>Histórico de temporadas</h2><small>${s.goalWins} meta(s) cumprida(s)</small></div>
  <section class="box">${s.seasonHistory.length ? `<table class="table"><thead><tr><th>Temporada</th><th>Respeito</th><th>Patrimônio</th></tr></thead><tbody>${s.seasonHistory.slice(-8).reverse().map(h => `<tr><td>${num(h.season)}</td><td>${num(h.respect)}</td><td>${format(h.money)}${h.goal ? `<div class="mini">${h.goalComplete ? 'Meta cumprida' : 'Meta não cumprida'}</div>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p>Nenhuma temporada encerrada ainda.</p>'}</section>
  <div class="section"><h2>Registro da carreira</h2></div><section class="box">${journal(s, 10)}</section>
  <div class="section"><h2>Salvamento</h2></div>
  <section class="box"><p>O progresso é salvo automaticamente <strong>somente neste navegador</strong> (chave própria do Marginalidade RPG). Exporte uma cópia para levar a outro aparelho. Não há sincronização em nuvem.</p>
    <div class="row" style="justify-content:flex-start">${btn('Exportar carreira', 'export', '', false, 'small')}${btn('Importar carreira', 'import', '', false, 'small ghost')}${btn('Recomeçar tudo', 'reset', '', false, 'small danger')}</div></section>`;
}

export function renderPanel(tab: PanelId, g: GameState, settingsHtml: string): string {
  switch (tab) {
    case 'resumo': return resumo(g);
    case 'historia': return historia(g);
    case 'missoes': return missoes(g);
    case 'cidade': return cidade(g);
    case 'economia': return economia(g);
    case 'gangue': return gangue(g);
    case 'temporada': return temporada(g);
    case 'ajustes': return settingsHtml;
  }
}
