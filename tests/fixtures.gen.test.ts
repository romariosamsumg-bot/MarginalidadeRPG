/**
 * Gera saves reais (pelo motor, nunca editados à mão) para os testes e2e do Ato I.
 * Só roda com GEN_FIXTURES=1:  GEN_FIXTURES=1 npx vitest run tests/fixtures.gen.test.ts
 */
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Store } from '../src/core/store';
import { seededRng } from '../src/core/legacy/util';
import { getNode, visibleChoices } from '../src/narrative/engine';
import { resolveInteraction, type TargetId } from '../src/narrative/triggers';
import { exportPayload } from '../src/persistence/storage';

function play(store: Store, picks: string[]) {
  for (let g = 0; g < 200; g++) {
    const s = store.get()!; const a = s.story.activeDialogue; if (!a) return;
    const node = getNode(a.sceneId, a.nodeId)!;
    const ch = visibleChoices(s, node);
    if (ch.length) { const w = picks.shift(); const p = ch.find(c => c.choice.id === w && c.enabled) ?? ch.find(c => c.enabled)!; store.dispatch({ type: 'story/choose', nodeId: node.id, choiceId: p.choice.id }); }
    else store.dispatch({ type: 'story/advance', nodeId: node.id });
  }
}
const talk = (store: Store, t: TargetId, picks: string[] = []) => {
  const o = resolveInteraction(store.get()!, t);
  if (o.kind === 'scene') { store.dispatch({ type: 'story/start', sceneId: o.sceneId }); play(store, picks); }
};
const dump = (store: Store, name: string) =>
  writeFileSync(new URL(`../e2e/fixtures/${name}.json`, import.meta.url), JSON.stringify(exportPayload(store.get()!, '0.1.0')));

it.skipIf(!process.env.GEN_FIXTURES)('gera saves do Ato I', () => {
  const store = new Store(() => true, seededRng(7));
  store.dispatch({ type: 'game/new', name: 'Dandara', city: 'Rio de Janeiro', appearance: 1, career: null });
  store.dispatch({ type: 'story/start', sceneId: 'A1-intro' }); play(store, []);
  talk(store, 'magrao', ['aceitar']); talk(store, 'casa', ['verdade']);
  store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' }); play(store, ['enfrentar', 'admitir']);
  store.dispatch({ type: 'world/move', area: 'vila', x: 470, y: 660, facing: -1 });
  dump(store, 'a1-m03-voltar-casa');
  talk(store, 'casa');
  store.dispatch({ type: 'world/move', area: 'casa', x: 760, y: 560, facing: -1 });
  dump(store, 'a1-m03-casa-lia');
  talk(store, 'lia', ['tudo']); talk(store, 'solange', ['magrao', 'agradecer']);
  store.dispatch({ type: 'world/move', area: 'vila', x: 1120, y: 662, facing: 1 });
  dump(store, 'a1-m04-passarela');
  talk(store, 'miro', ['ouvir', 'recusar']);
  store.dispatch({ type: 'world/move', area: 'vila', x: 1640, y: 650, facing: 1 });
  dump(store, 'a1-m05-crise');
  store.dispatch({ type: 'story/start', sceneId: 'A1-M05-crise' }); play(store, ['verdade']);
  talk(store, 'miro', ['proteger']);
  store.dispatch({ type: 'world/move', area: 'vila', x: 2000, y: 662, facing: 1 });
  dump(store, 'a1-fim');
});
