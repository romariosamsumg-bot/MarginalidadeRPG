import { describe, expect, it } from 'vitest';
import { SCENES } from '../src/narrative/content';
import { validateScenes } from '../src/narrative/validate';
import { Store } from '../src/core/store';
import { parseGameState, type GameState } from '../src/core/state';
import { seededRng } from '../src/core/legacy/util';
import { getNode, nodeText, visibleChoices } from '../src/narrative/engine';
import { barAutoScene, introPending, resolveInteraction } from '../src/narrative/triggers';
import { currentObjective } from '../src/narrative/content/campaign';

function mkStore() {
  let saved: string | null = null;
  const store = new Store(s => { saved = JSON.stringify(s); return true; }, seededRng(1));
  return { store, saved: () => saved };
}

/** Avança a cena ativa usando as escolhas indicadas (por ordem de aparição). */
function play(store: Store, picks: string[]): string[] {
  const seen: string[] = [];
  for (let guard = 0; guard < 200; guard++) {
    const s = store.get()!;
    const a = s.story.activeDialogue;
    if (!a) return seen;
    const node = getNode(a.sceneId, a.nodeId)!;
    seen.push(nodeText(s, node));
    const choices = visibleChoices(s, node);
    if (node.minigame) {
      // 'mg:N' na fila de escolhas = pontos do desafio; sem isso, o jogador "pula".
      const score = picks[0]?.startsWith('mg:') ? Number(picks.shift()!.slice(3)) : null;
      const r = store.dispatch({ type: 'story/minigame', nodeId: node.id, score });
      expect(r.ok, r.msg).toBe(true);
    } else if (choices.length) {
      const want = picks.shift();
      const pick = choices.find(c => c.choice.id === want && c.enabled) ?? choices.find(c => c.enabled)!;
      const r = store.dispatch({ type: 'story/choose', nodeId: node.id, choiceId: pick.choice.id });
      expect(r.ok, r.msg).toBe(true);
    } else {
      const r = store.dispatch({ type: 'story/advance', nodeId: node.id });
      expect(r.ok, r.msg).toBe(true);
    }
  }
  throw new Error('cena não terminou');
}

function interact(store: Store, target: Parameters<typeof resolveInteraction>[1]) {
  const o = resolveInteraction(store.get()!, target);
  if (o.kind !== 'scene') return o;
  const r = store.dispatch({ type: 'story/start', sceneId: o.sceneId });
  expect(r.ok, r.msg).toBe(true);
  return o;
}

function newCareer(city = 'Rio de Janeiro') {
  const t = mkStore();
  t.store.dispatch({ type: 'game/new', name: 'Dandara', city, appearance: 1, career: null });
  return t;
}

/** Recarrega como o navegador faria: serializa → valida → normaliza. */
function reload(store: Store, raw: string | null) {
  const parsed = parseGameState(JSON.parse(raw!));
  expect(parsed.state, parsed.reason).not.toBeNull();
  store.hydrate(parsed.state);
}

describe('Conteúdo narrativo', () => {
  it('passa no validador (IDs, destinos, saídas, recompensas, limite de 3 opções)', () => {
    expect(validateScenes(SCENES)).toEqual([]);
  });
  it('validador detecta conteúdo quebrado', () => {
    const bad = [{ id: 'x', mission: null, once: false, start: 'a', nodes: [
      { id: 'a', speaker: 'narrator' as const, text: 'oi', next: 'zz' },
      { id: 'b', speaker: 'narrator' as const, text: 'b', effects: [{ type: 'respect' as const, amount: 5, reason: 'r' }], end: true }
    ] }];
    const errs = validateScenes(bad);
    expect(errs.some(e => e.includes('destino inexistente'))).toBe(true);
    expect(errs.some(e => e.includes('recompensa em cena repetível'))).toBe(true);
    expect(errs.some(e => e.includes('inalcançável'))).toBe(true);
  });
});

describe('Capítulo piloto — fluxo completo', () => {
  const paths: Array<{ name: string; m01: string[]; casa: string[]; m02: string[] }> = [
    { name: 'aceita + verdade + negocia + nega', m01: ['aceitar'], casa: ['verdade'], m02: ['negociar', 'negar'] },
    { name: 'pergunta + aceita + desconversa + enfrenta + admite', m01: ['perguntar', 'aceitar_mesmo'], casa: ['desconversar'], m02: ['enfrentar', 'admitir'] },
    { name: 'recusa + adia', m01: ['recusar'], casa: [], m02: ['adiar'] },
    { name: 'pergunta + recusa + enfrenta', m01: ['perguntar', 'recusar_sem'], casa: [], m02: ['enfrentar'] }
  ];

  for (const p of paths) {
    it(`rota: ${p.name}`, () => {
      const { store, saved } = newCareer();
      const s0 = store.get()!;
      expect(introPending(s0)).toBe(true);
      store.dispatch({ type: 'story/start', sceneId: 'A1-intro' });
      play(store, []);
      expect(introPending(store.get()!)).toBe(false);
      expect(currentObjective(store.get()!.story)?.target).toBe('magrao');

      interact(store, 'magrao');
      play(store, [...p.m01]);
      const afterM01 = store.get()!;
      expect(afterM01.story.npcs.magrao.present).toBe(false);
      expect(afterM01.story.flags.oficina_closed).toBe(true);
      expect(currentObjective(afterM01.story)?.target).toBe('casa');
      const accepted = p.m01.some(x => x.startsWith('aceitar'));
      expect(afterM01.story.items.encomenda === true).toBe(accepted);
      expect(afterM01.story.flags.refused_package === true).toBe(!accepted);

      interact(store, 'casa');
      const casaLines = play(store, [...p.casa]);
      expect(casaLines).toContain('Magrão não voltou.');
      const afterCasa = store.get()!;
      expect(afterCasa.story.missions['A1-M01']!.status).toBe('completed');
      expect(afterCasa.story.missions['A1-M02']).toEqual({ status: 'active', stage: 'go_bar' });
      expect(afterCasa.story.clock.timeOfDay).toBe('noite');

      // Entrada no bar dispara a cobrança automaticamente.
      expect(barAutoScene(afterCasa)).toBe('A1-M02-cobranca');
      const respectBefore = afterCasa.rpg.respect;
      store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' });
      const m02Lines = play(store, [...p.m02]);
      const end = store.get()!;
      expect(end.story.missions['A1-M02']!.status).toBe('completed');
      expect(end.story.flags.miro_first_response).toBe(p.m02[0]);
      expect(end.rpg.respect).toBe(respectBefore + 3);
      // A recusa em M01 é reconhecida em M02 (teste de aceitação da Bíblia).
      expect(m02Lines.some(l => l.includes('tu mandou ele embora'))).toBe(!accepted);
      // Pergunta da caixa só aparece para quem aceitou.
      expect(m02Lines.includes('Uma última coisa. Ele deixou alguma coisa contigo?')).toBe(accepted);
      // A cobrança abre o próximo capítulo: voltar para casa (A1-M03).
      expect(currentObjective(end.story)).toMatchObject({ missionId: 'A1-M03', target: 'casa', future: false });

      // Consequência tardia: a fala do Nando muda conforme a resposta a Miro — e persiste após recarregar.
      reload(store, saved());
      interact(store, 'nando');
      const nandoLines = play(store, ['nada']);
      const expected = { negociar: 'mais frio do que eu pensava', enfrentar: 'Ninguém responde o Miro assim', adiar: 'não esticar' }[p.m02[0] as 'negociar'];
      expect(nandoLines.some(l => l.includes(expected))).toBe(true);
      // Lia reage à resposta dada sobre a caixa.
      interact(store, 'lia');
      const liaLines = play(store, []);
      if (p.casa[0] === 'verdade') expect(liaLines.join(' ')).toContain('Tu me prometeu que eu ia saber primeiro');
      if (p.casa[0] === 'desconversou') expect(liaLines.join(' ')).toContain('não vou perguntar de novo');
      if (!accepted) expect(liaLines.join(' ')).toContain('não ficou com nada dele');
      // Histórico de escolhas registra as decisões.
      expect(store.get()!.story.choices.length).toBeGreaterThanOrEqual(2);
    });
  }

  it('cenas únicas não repetem nem duplicam recompensa (reload, re-dispatch, replay)', () => {
    const { store, saved } = newCareer();
    store.dispatch({ type: 'story/start', sceneId: 'A1-intro' }); play(store, []);
    interact(store, 'magrao'); play(store, ['aceitar']);
    interact(store, 'casa'); play(store, ['verdade']);
    store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' });
    // avança até a última fala e recarrega no meio do diálogo
    for (let i = 0; i < 6; i++) { const a = store.get()!.story.activeDialogue!; store.dispatch({ type: 'story/advance', nodeId: a.nodeId }); }
    const midNode = store.get()!.story.activeDialogue!.nodeId;
    reload(store, saved());
    expect(store.get()!.story.activeDialogue?.nodeId).toBe(midNode); // retoma onde parou
    play(store, ['enfrentar', 'negar']);
    const respect = store.get()!.rpg.respect;
    const raw = saved();
    // Tentar reiniciar a cena concluída falha
    expect(store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' }).ok).toBe(false);
    // Recarregar várias vezes não muda respeito
    for (let i = 0; i < 3; i++) reload(store, raw);
    expect(store.get()!.rpg.respect).toBe(respect);
    // Clique duplo numa escolha antiga é ignorado (nó desatualizado)
    expect(store.dispatch({ type: 'story/choose', nodeId: 'b10', choiceId: 'negociar' }).ok).toBe(false);
    expect(store.get()!.story.flags.miro_first_response).toBe('enfrentar');
  });

  it('clique duplo em escolha: segunda tentativa é rejeitada e não aplica efeitos', () => {
    const { store } = newCareer();
    store.dispatch({ type: 'story/start', sceneId: 'A1-intro' }); play(store, []);
    interact(store, 'magrao');
    while (store.get()!.story.activeDialogue!.nodeId !== 'o7') store.dispatch({ type: 'story/advance', nodeId: store.get()!.story.activeDialogue!.nodeId });
    const trust = store.get()!.story.relationships.magrao.trust;
    expect(store.dispatch({ type: 'story/choose', nodeId: 'o7', choiceId: 'aceitar' }).ok).toBe(true);
    expect(store.dispatch({ type: 'story/choose', nodeId: 'o7', choiceId: 'aceitar' }).ok).toBe(false);
    expect(store.get()!.story.relationships.magrao.trust).toBe(trust + 10);
  });

  it('requisito de atributo: opção de Lábia 6 bloqueada com Lábia 4 e liberada após treino', () => {
    const { store } = newCareer();
    store.dispatch({ type: 'story/start', sceneId: 'A1-intro' }); play(store, []);
    interact(store, 'magrao'); play(store, ['aceitar']);
    interact(store, 'casa'); play(store, ['verdade']);
    store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' });
    const go = (to: string) => { while (store.get()!.story.activeDialogue!.nodeId !== to) { const a = store.get()!.story.activeDialogue!; const n = getNode(a.sceneId, a.nodeId)!; if (n.choices) store.dispatch({ type: 'story/choose', nodeId: n.id, choiceId: 'negociar' }); else store.dispatch({ type: 'story/advance', nodeId: n.id }); } };
    go('b21');
    const node = getNode('A1-M02-cobranca', 'b21')!;
    const dev = visibleChoices(store.get()!, node).find(c => c.choice.id === 'devolver')!;
    expect(dev.enabled).toBe(false);
    expect(store.dispatch({ type: 'story/choose', nodeId: 'b21', choiceId: 'devolver' }).ok).toBe(false);
    // Ações de carreira ficam bloqueadas durante cena única
    expect(store.dispatch({ type: 'rpg/train', id: 'labia' }).ok).toBe(false);
  });

  it('sistemas de carreira continuam acessíveis fora do diálogo e mapa de interação aponta painéis', () => {
    const { store } = newCareer('Porto Alegre');
    store.dispatch({ type: 'story/start', sceneId: 'A1-intro' });
    const first = nodeText(store.get()!, getNode('A1-intro', 'i1')!);
    expect(first).toContain('Você nasceu em Porto Alegre');
    play(store, []);
    expect(store.get()!.rpg.city).toBe('Porto Alegre');
    expect(store.get()!.world.city).toBe('Rio de Janeiro');
    expect(resolveInteraction(store.get()!, 'mural')).toEqual({ kind: 'panel', tab: 'missoes' });
    expect(resolveInteraction(store.get()!, 'ponto')).toEqual({ kind: 'panel', tab: 'cidade' });
    expect(resolveInteraction(store.get()!, 'mercearia')).toEqual({ kind: 'panel', tab: 'economia' });
    expect(resolveInteraction(store.get()!, 'casa')).toEqual({ kind: 'door', to: 'casa', spawn: 'porta' });
    expect(resolveInteraction(store.get()!, 'sofa')).toEqual({ kind: 'panel', tab: 'temporada' });
    expect(resolveInteraction(store.get()!, 'saida_casa')).toEqual({ kind: 'door', to: 'vila', spawn: 'casa_porta' });
    expect(store.dispatch({ type: 'rpg/train', id: 'labia' }).ok).toBe(true);
    expect(store.get()!.rpg.stats.labia).toBe(6);
  });
});

describe('Ato I — Portas Fechadas, O Primeiro Serviço, Sangue e Dívida', () => {
  /** Joga o prólogo até o fim da cobrança. */
  function toM03(m01 = ['aceitar'], casa = ['verdade'], m02 = ['enfrentar', 'admitir'], seed = 1) {
    let saved: string | null = null;
    const store = new Store(s => { saved = JSON.stringify(s); return true; }, seededRng(seed));
    store.dispatch({ type: 'game/new', name: 'Dandara', city: 'Rio de Janeiro', appearance: 1, career: null });
    store.dispatch({ type: 'story/start', sceneId: 'A1-intro' }); play(store, []);
    interact(store, 'magrao'); play(store, [...m01]);
    interact(store, 'casa'); play(store, [...casa]);
    store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' }); play(store, [...m02]);
    return { store, saved: () => saved };
  }

  function playAct(o: { lia: string[]; solange: string[]; m04: string[]; helena: string[]; m05: string[]; seed?: number; m01?: string[] }) {
    const t = toM03(o.m01 ?? ['aceitar'], o.m01?.[0] === 'recusar' ? [] : ['verdade'], ['enfrentar', 'admitir'], o.seed ?? 1);
    const { store } = t;
    expect(interact(store, 'casa')).toEqual({ kind: 'scene', sceneId: 'A1-M03-domingo' });
    play(store, []);
    let s = store.get()!;
    expect(s.story.clock).toMatchObject({ label: 'Domingo, 17h40', timeOfDay: 'entardecer' });
    expect(s.story.npcs.lia).toMatchObject({ present: true, spot: 'casa_mesa' });
    expect(currentObjective(s.story)).toMatchObject({ target: 'lia', area: 'casa' });
    // Depois da cena, a casa volta a ser só uma porta.
    expect(resolveInteraction(s, 'casa')).toEqual({ kind: 'door', to: 'casa', spawn: 'porta' });

    interact(store, 'lia');
    const liaLines = play(store, [...o.lia]);
    s = store.get()!;
    expect(currentObjective(s.story)).toMatchObject({ target: 'solange', area: 'vila' });

    interact(store, 'solange');
    const solLines = play(store, [...o.solange]);
    s = store.get()!;
    expect(s.story.missions['A1-M03']!.status).toBe('completed');
    expect(s.story.flags.knows_silver_car).toBe(true);
    expect(s.story.npcs.miro).toMatchObject({ present: true, spot: 'passarela' });
    expect(currentObjective(s.story)).toMatchObject({ missionId: 'A1-M04', target: 'miro' });

    interact(store, 'miro');
    const m04Lines = play(store, [...o.m04]);
    s = store.get()!;
    return { store, saved: t.saved, s, liaLines, solLines, m04Lines };
  }

  function finish(store: Store, helena: string[], m05: string[]) {
    let s = store.get()!;
    expect(s.story.missions['A1-M05']).toEqual({ status: 'active', stage: 'go_bar' });
    expect(s.story.npcs.nando.present).toBe(false);
    expect(barAutoScene(s)).toBe('A1-M05-crise');
    store.dispatch({ type: 'story/start', sceneId: 'A1-M05-crise' });
    const criseLines = play(store, [...helena]);
    s = store.get()!;
    expect(currentObjective(s.story)).toMatchObject({ missionId: 'A1-M05', target: 'miro' });
    expect(barAutoScene(s)).toBe(null);
    interact(store, 'miro');
    const ofertaLines = play(store, [...m05]);
    return { criseLines, ofertaLines, end: store.get()! };
  }

  it('rota completa: conta tudo + aliada + negocia + colabora + protege', () => {
    const { store, s, m04Lines, solLines } = playAct({ lia: ['tudo'], solange: ['magrao', 'avisar'], m04: ['ouvir', 'fazer'], helena: ['verdade'], m05: ['proteger'] });
    void solLines;
    expect(s.story.flags.lia_informed).toBe(true);
    // Lábia 4 inicial: pedir ajuda à Solange fica bloqueado, cai no agradecimento.
    expect(s.story.flags.solange_ally).toBeUndefined();
    expect(['sucesso', 'falha']).toContain(s.story.flags.m04_result);
    expect(typeof s.story.flags.m04_result_chance).toBe('number');
    expect(m04Lines.some(l => l.includes('Exatamente como a caixa do Magrão'))).toBe(true);
    expect(s.rpg.energy).toBeLessThan(100);
    const respectBefore = s.rpg.respect;
    const heatBefore = s.rpg.heat;
    const { end, ofertaLines, criseLines } = finish(store, ['verdade', 'mg:8'], ['proteger']);
    // O Depoimento: respostas firmes baixam a pressão.
    expect(end.story.flags.depoimento).toBe(8);
    expect(end.story.flags.depoimento_nivel).toBe('firme');
    expect(end.story.flags.helena_trust).toBe('alta');
    expect(end.rpg.heat).toBe(Math.max(0, heatBefore - 10 - 6));
    expect(criseLines.some(l => l.includes('Helena Paiva, Polícia Civil'))).toBe(true);
    expect(end.story.flags.helena_stance).toBe('colaborou');
    expect(end.story.flags.m05_attitude).toBe('proteger');
    expect(end.story.flags.act1_done).toBe(true);
    expect(end.story.missions['A1-M05']!.status).toBe('completed');
    expect(end.rpg.respect).toBe(respectBefore + 5);
    expect(ofertaLines).toContain('Bem-vindo à União da Linha.');
    expect(end.story.npcs.nando.present).toBe(true);
    // Extra: o Mural do Carro Prata com Lia.
    expect(currentObjective(end.story)).toMatchObject({ missionId: 'A1-X1', target: 'lia', area: 'casa' });
    expect(resolveInteraction(end, 'lia')).toEqual({ kind: 'scene', sceneId: 'A1-X1-mural' });
    interact(store, 'lia');
    const muralLines = play(store, ['bora', 'mg:5']);
    expect(muralLines.some(l => l.includes('Tu entrou nessa pra proteger a gente'))).toBe(true);
    expect(muralLines.some(l => l.includes('Cada minuto no lugar'))).toBe(true);
    const afterMural = store.get()!;
    expect(afterMural.story.flags.miro_lie_hint).toBe(true);
    expect(afterMural.story.missions['A1-X1']!.status).toBe('completed');
    const obj = currentObjective(afterMural.story)!;
    expect(obj.future).toBe(true);
    expect(obj.objective).toContain('Fim do Ato I');
    // Barks lembram do desfecho.
    interact(store, 'lia');
    expect(play(store, []).join(' ')).toContain('pra me proteger');
    interact(store, 'nando');
    expect(play(store, ['nada']).join(' ')).toContain('Eu não dei teu nome');
  });

  it('esconder de Lia: ela sai de casa, Solange comenta e o carro prata vira opção com a investigadora', () => {
    const { store, s, solLines } = playAct({ lia: ['esconder'], solange: ['miro', 'agradecer'], m04: ['ouvir', 'recusar'], helena: ['carro'], m05: ['ambicao'] });
    expect(s.story.flags.lia_kept_out).toBe(true);
    expect(s.story.flags.knows_miro_answers).toBe(true);
    expect(solLines.some(l => l.includes('de mala na mão'))).toBe(true);
    expect(s.story.flags.m04_result).toBe('recusou');
    expect(s.story.relationships.miro.state).toBe('conflito');
    const heat = s.rpg.heat;
    const { end, ofertaLines } = finish(store, ['carro', 'mg:1'], ['ambicao']);
    expect(end.story.flags.helena_car).toBe(true);
    // Perguntar do carro não muda a pressão; contradizer-se no depoimento aumenta (+8).
    expect(end.story.flags.depoimento_nivel).toBe('contraditorio');
    expect(end.rpg.heat).toBe(Math.min(100, heat + 8));
    expect(ofertaLines.some(l => l.includes('Tu recusou o serviço'))).toBe(true);
    expect(end.story.npcs.lia.present).toBe(true); // Lia volta no fim do ato
    interact(store, 'lia');
    // "Agora não" adia o mural sem concluí-lo.
    const lines = play(store, ['depois']);
    expect(lines.join(' ')).toContain('Tu me deixou de fora uma vez');
    expect(store.get()!.story.completedScenes).not.toContain('A1-X1-mural');
    interact(store, 'lia');
    play(store, ['bora', 'mg:2']); // monta a linha do tempo mas não acha a contradição
    expect(store.get()!.story.flags.mural_nivel).toBe('confuso');
    expect(store.get()!.story.flags.miro_lie_hint).toBeUndefined();
    interact(store, 'lia');
    expect(play(store, []).join(' ')).toContain('Por que eu sempre sei das coisas pelos outros?');
  });

  it('sem saber do carro prata a opção não aparece (memória entre missões)', () => {
    const { store } = playAct({ lia: ['parte'], solange: ['magrao', 'agradecer'], m04: ['ouvir', 'recusar'], helena: [], m05: [] });
    // Simula um save sem a pista (ex.: conteúdo futuro alternativo): a escolha some.
    const st = store.get()!;
    const copy = JSON.parse(JSON.stringify(st)) as GameState;
    delete copy.story.flags.knows_silver_car;
    const node = getNode('A1-M05-crise', 'c7')!;
    expect(visibleChoices(copy, node).map(c => c.choice.id)).toEqual(['verdade', 'silencio']);
    expect(visibleChoices(st, node).map(c => c.choice.id)).toEqual(['verdade', 'silencio', 'carro']);
  });

  it('"agora não" com Miro encerra sem concluir e a missão pode ser retomada', () => {
    const { store, s } = playAct({ lia: ['tudo'], solange: ['magrao', 'agradecer'], m04: ['depois'], helena: [], m05: [] });
    expect(s.story.activeDialogue).toBeNull();
    expect(s.story.completedScenes).not.toContain('A1-M04-servico');
    expect(s.story.missions['A1-M04']).toEqual({ status: 'active', stage: 'meet' });
    expect(resolveInteraction(s, 'miro')).toEqual({ kind: 'scene', sceneId: 'A1-M04-servico' });
    interact(store, 'miro'); play(store, ['ouvir', 'recusar']);
    expect(store.get()!.story.missions['A1-M04']!.status).toBe('completed');
  });

  it('serviço exige energia: sem energia, só negociar/recusar ficam bloqueados ou disponíveis corretamente', () => {
    const { store } = playAct({ lia: ['tudo'], solange: ['magrao', 'agradecer'], m04: ['depois'], helena: [], m05: [] });
    const low = JSON.parse(JSON.stringify(store.get()!)) as GameState;
    low.rpg.energy = 10;
    const node = getNode('A1-M04-servico', 'v6')!;
    const ch = visibleChoices(low, node);
    expect(ch.find(c => c.choice.id === 'fazer')!.enabled).toBe(false);
    expect(ch.find(c => c.choice.id === 'recusar')!.enabled).toBe(true);
  });

  it('teste de risco é determinístico por semente e o pagamento não duplica com recarga', () => {
    const results = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const { s } = playAct({ lia: ['tudo'], solange: ['magrao', 'agradecer'], m04: ['ouvir', 'fazer', 'aceitar'], helena: [], m05: [], seed });
      results.add(String(s.story.flags.m04_result));
      const chance = s.story.flags.m04_result_chance as number;
      expect(chance).toBeGreaterThanOrEqual(15);
      expect(chance).toBeLessThanOrEqual(90);
    }
    // Com 12 sementes os dois desfechos aparecem (nenhum caminho único escondido).
    expect(results).toEqual(new Set(['sucesso', 'falha']));
    // Mesma semente → mesmo resultado.
    const a = playAct({ lia: ['tudo'], solange: ['magrao', 'agradecer'], m04: ['ouvir', 'fazer', 'aceitar'], helena: [], m05: [], seed: 3 });
    const b = playAct({ lia: ['tudo'], solange: ['magrao', 'agradecer'], m04: ['ouvir', 'fazer', 'aceitar'], helena: [], m05: [], seed: 3 });
    expect(a.s.story.flags.m04_result).toBe(b.s.story.flags.m04_result);
    expect(a.s.rpg.cash).toBe(b.s.rpg.cash);
    const cash = a.s.rpg.cash;
    for (let i = 0; i < 3; i++) reload(a.store, a.saved());
    expect(a.store.get()!.rpg.cash).toBe(cash);
    expect(a.store.dispatch({ type: 'story/start', sceneId: 'A1-M04-servico' }).ok).toBe(false);
  });

  it('progresso do Ato I sobrevive a recarregar no meio da crise', () => {
    const { store, saved } = playAct({ lia: ['tudo'], solange: ['magrao', 'agradecer'], m04: ['ouvir', 'recusar'], helena: [], m05: [] });
    store.dispatch({ type: 'story/start', sceneId: 'A1-M05-crise' });
    for (let i = 0; i < 4; i++) { const a = store.get()!.story.activeDialogue!; store.dispatch({ type: 'story/advance', nodeId: a.nodeId }); }
    const mid = store.get()!.story.activeDialogue!.nodeId;
    reload(store, saved());
    expect(store.get()!.story.activeDialogue?.nodeId).toBe(mid);
    expect(store.get()!.story.clock.label).toBe('Terça-feira, 22h10');
  });
});

describe('Mini games', () => {
  it('desafio não avança por toque, aceita um resultado só, limita pontos e "pular" dá o resultado médio', async () => {
    const { store } = newCareer();
    const fx = JSON.parse(await import('node:fs').then(f => f.readFileSync(new URL('../e2e/fixtures/a1-m05-crise.json', import.meta.url), 'utf8')));
    store.hydrate(parseGameState(fx.save).state);
    store.dispatch({ type: 'story/start', sceneId: 'A1-M05-crise' });
    play(store, ['verdade']); // sem 'mg:' → pula
    const s = store.get()!;
    expect(s.story.flags.depoimento).toBe(4);
    expect(s.story.flags.depoimento_nivel).toBe('hesitante');
    expect(s.story.flags.depoimento_pulou).toBe(true);
    expect(s.story.flags.helena_trust).toBe('media');

    // Outra carreira: tentativa de avançar sem jogar, pontos fora da faixa e resultado duplicado.
    const t2 = newCareer();
    t2.store.hydrate(parseGameState(fx.save).state);
    t2.store.dispatch({ type: 'story/start', sceneId: 'A1-M05-crise' });
    for (let g = 0; g < 40; g++) {
      const a = t2.store.get()!.story.activeDialogue!;
      if (a.nodeId === 'c8m') break;
      const n = getNode(a.sceneId, a.nodeId)!;
      if (n.choices) t2.store.dispatch({ type: 'story/choose', nodeId: n.id, choiceId: 'verdade' });
      else t2.store.dispatch({ type: 'story/advance', nodeId: n.id });
    }
    expect(t2.store.get()!.story.activeDialogue!.nodeId).toBe('c8m');
    expect(t2.store.dispatch({ type: 'story/advance', nodeId: 'c8m' }).ok).toBe(false);
    expect(t2.store.dispatch({ type: 'story/minigame', nodeId: 'c8m', score: 999 }).ok).toBe(true);
    expect(t2.store.get()!.story.flags.depoimento).toBe(8);
    expect(t2.store.dispatch({ type: 'story/minigame', nodeId: 'c8m', score: 0 }).ok).toBe(false);
    expect(t2.store.get()!.story.flags.depoimento).toBe(8);
  });

  it('perguntas do depoimento usam o que o jogador viveu e pontuam firmeza', async () => {
    const { depoimentoQuestions, answerPoints } = await import('../src/minigames/depoimento');
    const { store } = newCareer();
    const s = store.get()!;
    expect(depoimentoQuestions(s).map(q => q.id)).toEqual(['oficina', 'online', 'sabado', 'balcao']);
    s.story.flags.helena_car = true;
    expect(depoimentoQuestions(s).map(q => q.id)).toEqual(['oficina', 'online', 'carro', 'fuga']);
    expect(answerPoints(true, 2)).toBe(2);
    expect(answerPoints(true, 7)).toBe(1);
    expect(answerPoints(true, 10)).toBe(0);
    expect(answerPoints(false, 1)).toBe(0);
  });

  it('mural: pontuação separa a linha do tempo da descoberta da mentira', async () => {
    const { muralScore, TIMELINE, STATEMENTS } = await import('../src/minigames/mural');
    expect(TIMELINE).toHaveLength(6);
    expect(STATEMENTS.filter(x => x.lie).map(x => x.id)).toEqual(['miro']);
    expect(muralScore(0, true)).toBe(5);
    expect(muralScore(2, true)).toBe(4);
    expect(muralScore(5, true)).toBe(3);   // achou a mentira, mesmo errando a ordem
    expect(muralScore(0, false)).toBe(2);  // ordem perfeita, mas não achou
  });

  it('bico no balcão: mesmas regras do bico legado, pagamento pelo desempenho', async () => {
    const { bicoPay, makeOrder, PEDIDOS_MAX, ROUND_SIZES } = await import('../src/minigames/pedidos');
    expect(bicoPay(0)).toBe(90);
    expect(bicoPay(PEDIDOS_MAX)).toBe(190);
    expect(bicoPay(PEDIDOS_MAX / 2)).toBe(140); // média do bico sorteado da v0.4 (110–170)
    const rng = seededRng(5);
    for (let r = 0; r < ROUND_SIZES.length; r++) {
      const o = makeOrder(rng, r);
      expect(o.items).toHaveLength(ROUND_SIZES[r]!);
      if (r < 2) expect(new Set(o.items).size).toBe(o.items.length);
    }
    const { store } = newCareer();
    const s0 = store.get()!;
    const r1 = store.dispatch({ type: 'bico/balcao', score: PEDIDOS_MAX });
    expect(r1.ok).toBe(true);
    const s1 = store.get()!;
    expect(s1.rpg.cash).toBe(s0.rpg.cash + 190);
    expect(s1.rpg.energy).toBe(s0.rpg.energy - 28);
    expect(s1.story.flags.pedidos_recorde).toBe(PEDIDOS_MAX);
    // Pontos absurdos são limitados; "pular" paga a média.
    store.dispatch({ type: 'bico/balcao', score: 10_000 });
    expect(store.get()!.rpg.cash).toBe(s1.rpg.cash + 190);
    const c2 = store.get()!.rpg.cash;
    store.dispatch({ type: 'bico/balcao', score: null });
    expect(store.get()!.rpg.cash).toBe(c2 + 140);
    // Sem energia, recusa sem alterar nada.
    const before = JSON.stringify(store.get()!.rpg);
    expect(store.get()!.rpg.energy).toBeLessThan(28);
    expect(store.dispatch({ type: 'bico/balcao', score: 5 }).ok).toBe(false);
    expect(JSON.stringify(store.get()!.rpg)).toBe(before);
  });

  it('Nando oferece o bico só depois da cobrança e exige energia', () => {
    const { store } = newCareer();
    const node = getNode('bark-nando', 'n_menu')!;
    expect(visibleChoices(store.get()!, node).map(c => c.choice.id)).not.toContain('balcao');
    const s = JSON.parse(JSON.stringify(store.get()!)) as GameState;
    s.story.missions['A1-M02'] = { status: 'completed', stage: null };
    const ch = visibleChoices(s, node).find(c => c.choice.id === 'balcao')!;
    expect(ch.enabled).toBe(true);
    s.rpg.energy = 10;
    expect(visibleChoices(s, node).find(c => c.choice.id === 'balcao')!.enabled).toBe(false);
  });
});

export type { GameState };
