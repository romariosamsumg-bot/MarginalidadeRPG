/**
 * Persistência local do Marginalidade RPG.
 * Chaves EXCLUSIVAS deste jogo. Este módulo nunca lê, escreve ou remove chaves de outros
 * jogos do mesmo domínio (em especial, o save do Submundo Brasil). Ver tests/persistence.test.ts.
 */
import { parseGameState, type GameState } from '../core/state';

export const STORAGE_KEY = 'marginalidade_rpg_v01';
export const BACKUP_KEY = 'marginalidade_rpg_v01_backup';
export const CORRUPT_KEY = 'marginalidade_rpg_v01_corrompido';
export const SETTINGS_KEY = 'marginalidade_rpg_settings_v01';
/** Todas as chaves que este jogo pode tocar. */
export const OWN_KEYS = [STORAGE_KEY, BACKUP_KEY, CORRUPT_KEY, SETTINGS_KEY] as const;

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }

function assertOwn(key: string) {
  if (!(OWN_KEYS as readonly string[]).includes(key)) throw new Error(`Chave não pertence ao Marginalidade RPG: ${key}`);
}
const get = (kv: KV, k: string) => { assertOwn(k); return kv.getItem(k); };
const set = (kv: KV, k: string, v: string) => { assertOwn(k); kv.setItem(k, v); };
const del = (kv: KV, k: string) => { assertOwn(k); kv.removeItem(k); };

export function safeStorage(): KV | null {
  try {
    const ls = globalThis.localStorage;
    const probe = '__marginalidade_probe__';
    ls.setItem(probe, '1'); ls.removeItem(probe);
    return ls;
  } catch { return null; }
}

export type LoadStatus = 'empty' | 'ok' | 'corrupt' | 'unavailable';
export interface LoadResult { status: LoadStatus; state: GameState | null; reason?: string }

export function loadSave(kv: KV | null): LoadResult {
  if (!kv) return { status: 'unavailable', state: null, reason: 'O armazenamento do navegador está indisponível (modo privado ou bloqueado).' };
  let raw: string | null;
  try { raw = get(kv, STORAGE_KEY); } catch { return { status: 'unavailable', state: null }; }
  if (!raw) return { status: 'empty', state: null };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { parsed = undefined; }
  const res = parsed === undefined ? { state: null, reason: 'Arquivo de save ilegível.' } : parseGameState(parsed);
  if (!res.state) {
    // Preserva o conteúdo original para recuperação manual; não apaga nada.
    try { if (!get(kv, CORRUPT_KEY)) set(kv, CORRUPT_KEY, raw); } catch { /* sem espaço: segue */ }
    return { status: 'corrupt', state: null, reason: res.reason };
  }
  const fromSchema = (parsed as { schema?: number }).schema;
  if (fromSchema !== res.state.schema) { try { set(kv, BACKUP_KEY, raw); } catch { /* ignore */ } }
  return { status: 'ok', state: res.state };
}

export function writeSave(kv: KV | null, s: GameState): boolean {
  if (!kv) return false;
  try { set(kv, STORAGE_KEY, JSON.stringify(s)); return true; } catch { return false; }
}

export function backupCurrent(kv: KV | null): void {
  if (!kv) return;
  try { const cur = get(kv, STORAGE_KEY); if (cur) set(kv, BACKUP_KEY, cur); } catch { /* ignore */ }
}

export function clearSave(kv: KV | null): void {
  if (!kv) return;
  try { backupCurrent(kv); del(kv, STORAGE_KEY); } catch { /* ignore */ }
}

export function readCorrupt(kv: KV | null): string | null {
  try { return kv ? get(kv, CORRUPT_KEY) : null; } catch { return null; }
}

/* ------------------------- Exportação / importação ------------------------- */

export const EXPORT_GAME = 'Marginalidade RPG';
export const MAX_IMPORT_BYTES = 600_000;

export function exportPayload(s: GameState, version: string) {
  return { game: EXPORT_GAME, format: 1, version, exportedAt: new Date().toISOString(), save: s };
}

export function exportFileName(s: GameState): string {
  return `marginalidade-rpg-t${s.rpg.season}-dia${s.rpg.day}.json`;
}

export type ImportResult = { ok: true; state: GameState } | { ok: false; reason: string };

/** Valida um arquivo de importação. Nunca executa nem renderiza conteúdo do arquivo como HTML. */
export function parseImport(text: string, byteSize = text.length): ImportResult {
  if (byteSize > MAX_IMPORT_BYTES) return { ok: false, reason: 'Arquivo muito grande para ser um save do jogo.' };
  let obj: unknown;
  try { obj = JSON.parse(text); } catch { return { ok: false, reason: 'O arquivo não é um JSON válido.' }; }
  if (typeof obj !== 'object' || obj === null) return { ok: false, reason: 'Formato desconhecido.' };
  const o = obj as Record<string, unknown>;
  if (o.game === 'Submundo Brasil') return { ok: false, reason: 'Este arquivo é do Submundo Brasil. Os dois jogos são independentes e o progresso não é transferido.' };
  if (o.game !== EXPORT_GAME || o.format !== 1) return { ok: false, reason: 'Este arquivo não é um save do Marginalidade RPG.' };
  const res = parseGameState(o.save);
  if (!res.state) return { ok: false, reason: res.reason || 'Save inválido.' };
  return { ok: true, state: res.state };
}
