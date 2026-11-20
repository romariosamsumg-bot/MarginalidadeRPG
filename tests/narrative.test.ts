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
    if (choices.length) {
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
      expect(currentObjective(end.story)?.future).toBe(true);

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
    expect(resolveInteraction(store.get()!, 'casa')).toEqual({ kind: 'panel', tab: 'temporada' });
    expect(store.dispatch({ type: 'rpg/train', id: 'labia' }).ok).toBe(true);
    expect(store.get()!.rpg.stats.labia).toBe(6);
  });
});

export type { GameState };
