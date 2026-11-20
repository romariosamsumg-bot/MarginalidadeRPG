import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { BACKUP_KEY, CORRUPT_KEY, exportPayload, loadSave, OWN_KEYS, parseImport, STORAGE_KEY, writeSave, clearSave, type KV } from '../src/persistence/storage';
import { loadSettings, sanitizeSettings, saveSettings, DEFAULT_SETTINGS } from '../src/persistence/settings';
import { newGame, parseGameState, SCHEMA_VERSION, validateGameState } from '../src/core/state';
import { Store } from '../src/core/store';
import { seededRng } from '../src/core/legacy/util';

class MemKV implements KV {
  m = new Map<string, string>();
  touched = new Set<string>();
  getItem(k: string) { this.touched.add(k); return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.touched.add(k); this.m.set(k, v); }
  removeItem(k: string) { this.touched.add(k); this.m.delete(k); }
}

const SUBMUNDO_KEY = 'submundo_brasil_v01';
const SUBMUNDO_SAVE = JSON.stringify({ schema: 1, name: 'Antigo', city: 'Recife', season: 3, day: 12, cash: 99999 });

describe('Isolamento do Submundo Brasil', () => {
  it('nenhuma chave própria coincide com a do Submundo', () => {
    expect(OWN_KEYS).not.toContain(SUBMUNDO_KEY as never);
    expect(STORAGE_KEY).toBe('marginalidade_rpg_v01');
  });

  it('ciclo completo de save não lê nem altera a chave do Submundo', () => {
    const kv = new MemKV();
    kv.m.set(SUBMUNDO_KEY, SUBMUNDO_SAVE);
    expect(loadSave(kv).status).toBe('empty');
    const s = newGame('Teste', 'Recife', 0);
    expect(writeSave(kv, s)).toBe(true);
    expect(loadSave(kv).state?.rpg.name).toBe('Teste');
    clearSave(kv);
    expect(kv.m.get(SUBMUNDO_KEY)).toBe(SUBMUNDO_SAVE);
    expect([...kv.touched].every(k => (OWN_KEYS as readonly string[]).includes(k))).toBe(true);
  });

  it('nenhum arquivo de src/ referencia a chave ou importa automaticamente o Submundo', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : files.push(p); } };
    walk(resolve(__dirname, '../src'));
    for (const f of files) expect(readFileSync(f, 'utf8').includes(SUBMUNDO_KEY), f).toBe(false);
  });

  it('save do Submundo copiado para a chave nova é rejeitado (não é o mesmo jogo) e preservado', () => {
    const kv = new MemKV();
    kv.m.set(STORAGE_KEY, SUBMUNDO_SAVE);
    const r = loadSave(kv);
    expect(r.status).toBe('corrupt');
    expect(kv.m.get(CORRUPT_KEY)).toBe(SUBMUNDO_SAVE);
  });

  it('arquivos de referência da v0.4 permanecem idênticos (checksum)', () => {
    const dir = resolve(__dirname, '../reference/submundo-brasil-v0.4');
    const sums = readFileSync(join(dir, 'SHA256SUMS'), 'utf8').trim().split('\n');
    expect(sums.length).toBeGreaterThanOrEqual(2);
    for (const line of sums) {
      const [hash, file] = line.split(/\s+/);
      const actual = createHash('sha256').update(readFileSync(join(dir, file!))).digest('hex');
      expect(actual, file).toBe(hash);
    }
  });
});

describe('Carregamento, validação e migração', () => {
  it('save corrompido é preservado em chave de recuperação e não quebra o jogo', () => {
    const kv = new MemKV();
    kv.m.set(STORAGE_KEY, '{isto não é json');
    const r = loadSave(kv);
    expect(r.status).toBe('corrupt');
    expect(kv.m.get(CORRUPT_KEY)).toBe('{isto não é json');
  });

  it('save de versão futura é recusado com mensagem clara', () => {
    const s = { ...newGame('Teste', 'Recife', 0), schema: SCHEMA_VERSION + 1 };
    expect(validateGameState(s).reason).toMatch(/versão mais nova/);
  });

  it('campos ausentes da história são preenchidos com padrão (normalização)', () => {
    const s: any = newGame('Teste', 'Recife', 2);
    delete s.story.relationships; delete s.story.traits; s.story.npcs = 'lixo';
    const r = parseGameState(JSON.parse(JSON.stringify(s)));
    expect(r.state?.story.relationships.miro.state).toBe('distancia');
    expect(r.state?.story.traits.lealdade).toBe(0);
    expect(r.state?.story.npcs.magrao.present).toBe(true);
  });

  it('serialização ida-e-volta preserva o estado', () => {
    const s = newGame('Teste', 'Salvador', 1);
    const r = parseGameState(JSON.parse(JSON.stringify(s)));
    expect(r.state).toEqual(s);
  });
});

describe('Importação/exportação', () => {
  const good = () => JSON.stringify(exportPayload(newGame('Teste', 'Recife', 0), '0.1.0'));
  it('aceita arquivo próprio válido', () => { expect(parseImport(good()).ok).toBe(true); });
  it('recusa JSON inválido', () => { expect(parseImport('{').ok).toBe(false); });
  it('recusa arquivo do Submundo Brasil com explicação', () => {
    const r = parseImport(JSON.stringify({ game: 'Submundo Brasil', version: '0.4', save: {} }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Submundo Brasil/);
  });
  it('recusa arquivo grande demais', () => { expect(parseImport('x', 10_000_000).ok).toBe(false); });
  it('recusa números e tipos adulterados', () => {
    const p = JSON.parse(good());
    p.save.rpg.cash = -50; expect(parseImport(JSON.stringify(p)).ok).toBe(false);
    const q = JSON.parse(good());
    q.save.story.flags['<script>'] = 'x'; expect(parseImport(JSON.stringify(q)).ok).toBe(false);
    const r = JSON.parse(good());
    r.save.rpg.log = [{ day: 1, msg: { evil: true } }]; expect(parseImport(JSON.stringify(r)).ok).toBe(false);
    const t = JSON.parse(good());
    t.save.story.missions['A1-M02'] = { status: 'concluida_hack', stage: null }; expect(parseImport(JSON.stringify(t)).ok).toBe(false);
  });
  it('nome com marcação HTML é neutralizado na normalização', () => {
    const p = JSON.parse(good());
    p.save.rpg.name = '<img src=x>';
    const r = parseImport(JSON.stringify(p));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.state.rpg.name).not.toMatch(/[<>]/);
  });
});

describe('Store atômico', () => {
  it('ação recusada não altera estado nem salva', () => {
    let saves = 0;
    const store = new Store(() => { saves++; return true; }, seededRng(9));
    store.dispatch({ type: 'game/new', name: 'Teste', city: 'Recife', appearance: 0, career: 'operador' });
    const before = JSON.stringify(store.get());
    const n = saves;
    expect(store.dispatch({ type: 'rpg/buy', id: 'show' }).ok).toBe(false); // sem dinheiro
    expect(store.dispatch({ type: 'rpg/bank', mode: 'withdraw', amount: 5 }).ok).toBe(false);
    expect(store.dispatch({ type: 'rpg/bank', mode: 'deposit', amount: 1.5 }).ok).toBe(false);
    expect(JSON.stringify(store.get())).toBe(before);
    expect(saves).toBe(n);
  });
  it('energia insuficiente bloqueia missão sem efeitos colaterais', () => {
    const store = new Store(() => true, seededRng(4));
    store.dispatch({ type: 'game/new', name: 'Teste', city: 'Recife', appearance: 0, career: null });
    store.dispatch({ type: 'rpg/skipNews' });
    let guard = 0;
    while (store.get()!.rpg.energy >= 16 && guard++ < 20) store.dispatch({ type: 'rpg/gig' }), store.dispatch({ type: 'rpg/layLow' }), store.dispatch({ type: 'rpg/mission', id: 'correria' });
    const s = store.get()!;
    if (s.rpg.jail === 0) {
      const before = JSON.stringify(s);
      const r = store.dispatch({ type: 'rpg/mission', id: 'correria' });
      expect(r.ok).toBe(false);
      expect(r.msg).toMatch(/Energia insuficiente/);
      expect(JSON.stringify(store.get())).toBe(before);
    }
  });
  it('ciclo de energia/pressão ao avançar o dia segue a v0.4', () => {
    const store = new Store(() => true, seededRng(2));
    store.dispatch({ type: 'game/new', name: 'Teste', city: 'Recife', appearance: 0, career: null });
    store.dispatch({ type: 'rpg/mission', id: 'correria' });
    const a = store.get()!.rpg;
    store.dispatch({ type: 'rpg/nextDay' });
    const b = store.get()!.rpg;
    expect(b.day).toBe(a.day + 1);
    expect(b.energy).toBe(Math.min(100, a.energy + 70));
    expect(b.heat).toBe(Math.max(0, a.heat - 20));
  });
  it('fim de temporada preserva a campanha e o mundo', () => {
    const store = new Store(() => true, seededRng(2));
    store.dispatch({ type: 'game/new', name: 'Teste', city: 'Recife', appearance: 0, career: null });
    const s = structuredClone(store.get()!);
    s.rpg.day = 30; s.story.flags.miro_first_response = 'adiar';
    store.hydrate(s);
    expect(store.dispatch({ type: 'rpg/endSeason' }).ok).toBe(true);
    expect(store.get()!.rpg.season).toBe(2);
    expect(store.get()!.story.flags.miro_first_response).toBe('adiar');
  });
});

describe('Configurações', () => {
  it('valores inválidos voltam ao padrão e volumes são limitados', () => {
    const s = sanitizeSettings({ musicVolume: 7, sfxVolume: 'alto', quality: 'ultra', muted: true });
    expect(s.musicVolume).toBe(1); expect(s.sfxVolume).toBe(DEFAULT_SETTINGS.sfxVolume); expect(s.quality).toBe('padrao'); expect(s.muted).toBe(true);
  });
  it('persistem na chave própria', () => {
    const kv = new MemKV();
    saveSettings(kv, { ...DEFAULT_SETTINGS, musicVolume: 0.2 });
    expect(loadSettings(kv).musicVolume).toBe(0.2);
    expect([...kv.touched]).toEqual(['marginalidade_rpg_settings_v01']);
  });
});

export { BACKUP_KEY };
