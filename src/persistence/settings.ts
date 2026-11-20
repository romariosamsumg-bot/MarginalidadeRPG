/** Configurações do jogador (separadas do save da carreira). */
import { SETTINGS_KEY, type KV } from './storage';

export type Quality = 'baixa' | 'padrao' | 'alta';
export interface Settings {
  soundEnabled: boolean;   // o usuário ativou o som por gesto explícito
  muted: boolean;
  musicVolume: number;     // 0..1
  sfxVolume: number;       // 0..1
  ambienceVolume: number;  // 0..1
  quality: Quality;
  rain: boolean;
  reducedMotion: 'auto' | 'on' | 'off';
  showFps: boolean;
  largeText: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: false, muted: false, musicVolume: 0.5, sfxVolume: 0.7, ambienceVolume: 0.6,
  quality: 'padrao', rain: false, reducedMotion: 'auto', showFps: false, largeText: false
};

const vol = (v: unknown, d: number) => typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d;

export function sanitizeSettings(raw: unknown): Settings {
  const o = (typeof raw === 'object' && raw) ? raw as Record<string, unknown> : {};
  const d = DEFAULT_SETTINGS;
  return {
    soundEnabled: typeof o.soundEnabled === 'boolean' ? o.soundEnabled : d.soundEnabled,
    muted: typeof o.muted === 'boolean' ? o.muted : d.muted,
    musicVolume: vol(o.musicVolume, d.musicVolume),
    sfxVolume: vol(o.sfxVolume, d.sfxVolume),
    ambienceVolume: vol(o.ambienceVolume, d.ambienceVolume),
    quality: o.quality === 'baixa' || o.quality === 'alta' || o.quality === 'padrao' ? o.quality : d.quality,
    rain: typeof o.rain === 'boolean' ? o.rain : d.rain,
    reducedMotion: o.reducedMotion === 'on' || o.reducedMotion === 'off' ? o.reducedMotion : 'auto',
    showFps: typeof o.showFps === 'boolean' ? o.showFps : d.showFps,
    largeText: typeof o.largeText === 'boolean' ? o.largeText : d.largeText
  };
}

export function loadSettings(kv: KV | null): Settings {
  if (!kv) return { ...DEFAULT_SETTINGS };
  try { const raw = kv.getItem(SETTINGS_KEY); return sanitizeSettings(raw ? JSON.parse(raw) : {}); } catch { return { ...DEFAULT_SETTINGS }; }
}

export function saveSettings(kv: KV | null, s: Settings): void {
  if (!kv) return;
  try { kv.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function prefersReducedMotion(s: Settings): boolean {
  if (s.reducedMotion === 'on') return true;
  if (s.reducedMotion === 'off') return false;
  try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false; } catch { return false; }
}
