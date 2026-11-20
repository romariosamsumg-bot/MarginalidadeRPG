/**
 * Áudio 100% sintetizado em tempo real (Web Audio). Nenhum arquivo de som, nenhuma
 * obra comercial: ambiente, passos, efeitos e música são gerados aqui.
 * Melhoria progressiva: se o navegador não suportar ou o usuário não ativar, o jogo segue mudo.
 */
import type { Settings } from '../persistence/settings';

type MusicMode = 'none' | 'theme' | 'radio';
type AmbienceMode = 'none' | 'vila' | 'bar';

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfxBus!: GainNode;
  private amb!: GainNode;
  private noise!: AudioBuffer;
  private ambNodes: AudioNode[] = [];
  private ambTimer = 0;
  private musicMode: MusicMode = 'none';
  private ambMode: AmbienceMode = 'none';
  private rain = false;
  private musicTimer = 0;
  private nextBeat = 0;
  private beat = 0;
  private musicVoice!: GainNode;
  enabled = false;
  private hiddenSuspended = false;

  get supported(): boolean { return typeof window !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext); }

  /** Deve ser chamado dentro de um gesto do usuário (clique/toque/tecla). */
  async enable(settings: Settings): Promise<boolean> {
    if (!this.supported) return false;
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AC();
        const c = this.ctx!;
        this.master = c.createGain();
        const comp = c.createDynamicsCompressor();
        comp.threshold.value = -16; comp.ratio.value = 4;
        this.master.connect(comp).connect(c.destination);
        this.music = c.createGain(); this.music.connect(this.master);
        this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
        this.amb = c.createGain(); this.amb.connect(this.master);
        this.musicVoice = c.createGain(); this.musicVoice.gain.value = 0; this.musicVoice.connect(this.music);
        this.noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx!.state !== 'running') await this.ctx!.resume();
      this.enabled = true;
      this.apply(settings);
      this.setAmbience(this.ambMode, this.rain, true);
      this.setMusic(this.musicMode, true);
      return true;
    } catch (e) {
      console.warn('[audio] indisponível', e);
      return false;
    }
  }

  apply(s: Settings) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const on = s.soundEnabled && !s.muted ? 1 : 0;
    this.master.gain.setTargetAtTime(on * 0.9, t, 0.05);
    this.music.gain.setTargetAtTime(s.musicVolume * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume, t, 0.05);
    this.amb.gain.setTargetAtTime(s.ambienceVolume * 0.8, t, 0.05);
  }

  /** Aba oculta: suspende tudo; ao voltar, retoma. */
  visibility(hidden: boolean) {
    if (!this.ctx || !this.enabled) return;
    if (hidden && this.ctx.state === 'running') { this.ctx.suspend(); this.hiddenSuspended = true; }
    else if (!hidden && this.hiddenSuspended) { this.ctx.resume(); this.hiddenSuspended = false; }
  }

  private noiseSrc(): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise; s.loop = true;
    s.loopStart = Math.random(); s.loopEnd = 2;
    return s;
  }

  private env(g: GainNode, t: number, peak: number, a: number, d: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  private tone(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, dest: AudioNode = this.sfxBus, delay = 0, filter?: number) {
    const c = this.ctx!, t = c.currentTime + delay;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); this.env(g, t, peak, 0.005, dur);
    let out: AudioNode = o;
    if (filter) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); out = f; }
    out.connect(g).connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  private burst(freq: number, q: number, dur: number, peak: number, dest: AudioNode = this.sfxBus, delay = 0, sweepTo?: number, type: BiquadFilterType = 'bandpass') {
    const c = this.ctx!, t = c.currentTime + delay;
    const n = this.noiseSrc();
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = c.createGain(); this.env(g, t, peak, Math.min(0.02, dur / 3), dur);
    n.connect(f).connect(g).connect(dest);
    n.start(t); n.stop(t + dur + 0.05);
  }

  sfx(name: string) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    switch (name) {
      case 'ui': this.tone('sine', 900, 1250, 0.05, 0.12); break;
      case 'select': this.tone('triangle', 620, 640, 0.06, 0.12); break;
      case 'confirm': this.tone('sine', 660, 660, 0.09, 0.16); this.tone('sine', 990, 990, 0.14, 0.14, this.sfxBus, 0.08); break;
      case 'error': this.tone('square', 190, 120, 0.2, 0.08, this.sfxBus, 0, 700); break;
      case 'open': this.burst(500, 1.2, 0.18, 0.18, this.sfxBus, 0, 1700); break;
      case 'close': this.burst(1500, 1.2, 0.16, 0.14, this.sfxBus, 0, 450); break;
      case 'interact': this.tone('triangle', 520, 780, 0.07, 0.14); this.burst(3000, 2, 0.02, 0.08); break;
      case 'door':
        this.tone('sine', 95, 48, 0.22, 0.4);
        { const c = this.ctx, t = c.currentTime; const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(260, t); o.frequency.linearRampToValueAtTime(340, t + 0.35);
          const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
          const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 4; const g = c.createGain(); this.env(g, t, 0.05, 0.05, 0.35);
          o.connect(f).connect(g).connect(this.sfxBus); o.start(t); lfo.start(t); o.stop(t + 0.45); lfo.stop(t + 0.45); }
        break;
      case 'transition': this.burst(1800, 0.7, 0.45, 0.12, this.sfxBus, 0, 200, 'lowpass'); break;
      case 'phone': this.tone('sine', 1400, 1400, 0.07, 0.12); this.tone('sine', 1760, 1760, 0.09, 0.1, this.sfxBus, 0.1); break;
      case 'card': this.tone('sine', 62, 40, 1.6, 0.5); this.burst(200, 0.6, 1.2, 0.08, this.sfxBus, 0, 60, 'lowpass'); break;
      case 'reward': [0, 0.07, 0.14].forEach((d, i) => this.tone('triangle', 1046 * (1 + i * 0.26), 1046 * (1 + i * 0.26), 0.12, 0.08, this.sfxBus, d)); break;
      case 'choice': this.tone('triangle', 330, 495, 0.16, 0.16); this.tone('sine', 165, 165, 0.3, 0.12); break;
      case 'type': this.burst(4200, 3, 0.012, 0.025); break;
    }
  }

  step(surface: 'rua' | 'piso') {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running') return;
    const v = 0.6 + Math.random() * 0.4;
    if (surface === 'rua') { this.burst(1100 + Math.random() * 500, 1.6, 0.05, 0.11 * v); this.tone('sine', 120, 70, 0.05, 0.08 * v); }
    else { this.burst(750 + Math.random() * 250, 2.2, 0.04, 0.12 * v); this.tone('triangle', 260, 180, 0.03, 0.05 * v); }
  }

  /* ------------------------------ Ambiente ------------------------------ */

  setAmbience(mode: AmbienceMode, rain: boolean, force = false) {
    if (!force && mode === this.ambMode && rain === this.rain) return;
    this.ambMode = mode; this.rain = rain;
    if (!this.ctx || !this.enabled) return;
    const c = this.ctx, t = c.currentTime;
    for (const n of this.ambNodes) { try { (n as AudioScheduledSourceNode).stop?.(t + 0.6); } catch { /* ignore */ } }
    this.ambNodes = [];
    clearInterval(this.ambTimer);
    if (mode === 'none') return;
    const loop = (filterType: BiquadFilterType, freq: number, q: number, vol: number, lfoRate = 0, lfoDepth = 0) => {
      const n = this.noiseSrc();
      const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 1.5);
      n.connect(f).connect(g).connect(this.amb);
      if (lfoRate) { const l = c.createOscillator(); l.frequency.value = lfoRate; const lg = c.createGain(); lg.gain.value = lfoDepth; l.connect(lg).connect(g.gain); l.start(); this.ambNodes.push(l); }
      n.start(); this.ambNodes.push(n);
    };
    if (mode === 'vila') {
      loop('lowpass', 170, 0.7, 0.35);                 // zumbido da cidade
      loop('bandpass', 520, 0.9, 0.05, 0.07, 0.035);   // vento
      if (rain) loop('highpass', 1800, 0.5, 0.12, 0.3, 0.02);
      this.ambTimer = window.setInterval(() => this.distantEvent(), 4200);
    } else {
      loop('lowpass', 260, 0.7, 0.18);                 // tom da sala
      loop('bandpass', 180, 3, 0.05, 3.2, 0.02);       // ventilador de teto
    }
  }

  private distantEvent() {
    if (!this.ctx || this.ctx.state !== 'running' || Math.random() < 0.35) return;
    const c = this.ctx, t = c.currentTime, r = Math.random();
    if (r < 0.5) { // carro passando ao longe
      const n = this.noiseSrc(); const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.4;
      f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(820, t + 1.6); f.frequency.exponentialRampToValueAtTime(240, t + 3.4);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      n.connect(f).connect(g).connect(this.amb); n.start(t); n.stop(t + 3.8);
    } else if (r < 0.8) { // moto ao longe
      const o = c.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(115, t + 1.2); o.frequency.linearRampToValueAtTime(85, t + 2.6);
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.035, t + 1); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
      o.connect(f).connect(g).connect(this.amb); o.start(t); o.stop(t + 3);
    } else { // cachorro latindo longe
      for (let i = 0; i < 2; i++) {
        const tt = t + i * 0.28, o = c.createOscillator(); o.type = 'square';
        o.frequency.setValueAtTime(520, tt); o.frequency.exponentialRampToValueAtTime(300, tt + 0.12);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
        const g = c.createGain(); this.env(g, tt, 0.02, 0.01, 0.12);
        o.connect(f).connect(g).connect(this.amb); o.start(tt); o.stop(tt + 0.2);
      }
    }
  }

  /* ------------------------------- Música ------------------------------- */

  setMusic(mode: MusicMode, force = false) {
    if (!force && mode === this.musicMode) return;
    this.musicMode = mode;
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    this.musicVoice.gain.cancelScheduledValues(t);
    this.musicVoice.gain.setTargetAtTime(mode === 'none' ? 0 : mode === 'radio' ? 0.55 : 0.8, t, mode === 'none' ? 0.6 : 1.2);
    clearInterval(this.musicTimer);
    if (mode === 'none') return;
    this.nextBeat = t + 0.1; this.beat = 0;
    this.musicTimer = window.setInterval(() => this.schedule(), 90);
  }

  private schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    const radio = this.musicMode === 'radio';
    const spb = radio ? 0.25 : 60 / 84 / 2; // colcheias
    while (this.nextBeat < c.currentTime + 0.35) {
      const b = this.beat, t = this.nextBeat;
      if (radio) this.radioBeat(b, t, spb); else this.themeBeat(b, t, spb);
      this.nextBeat += spb * (b % 2 === 0 ? 1.06 : 0.94); // leve suingue
      this.beat++;
    }
  }

  /** Tema "O Preço do Poder": pad menor, baixo grave e percussão esparsa. */
  private themeBeat(b: number, t: number, spb: number) {
    const c = this.ctx!;
    const chords = [[45, 57, 60, 64, 67], [41, 53, 57, 60, 64], [38, 50, 53, 57, 62], [40, 52, 56, 59, 62]];
    const bar = Math.floor(b / 8) % chords.length;
    if (b % 8 === 0) {
      const ch = chords[bar]!, dur = spb * 8 + 0.6;
      ch.slice(1).forEach((n, i) => {
        for (const det of [-6, 5]) {
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(n); o.detune.value = det;
          const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + dur / 2); f.frequency.linearRampToValueAtTime(600, t + dur);
          const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018 - i * 0.002, t + 1.1); g.gain.linearRampToValueAtTime(0.0001, t + dur);
          o.connect(f).connect(g).connect(this.musicVoice); o.start(t); o.stop(t + dur + 0.1);
        }
      });
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = NOTE(ch[0]! - 12);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.musicVoice); o.start(t); o.stop(t + dur + 0.1);
    }
    // Percussão: aro e surdo discretos, com variação
    if (b % 8 === 3 || b % 8 === 6) this.burst(2100, 3, 0.04, 0.05, this.musicVoice, t - c.currentTime);
    if (b % 16 === 0 || b % 16 === 10) this.tone('sine', 70, 45, 0.3, 0.12, this.musicVoice, t - c.currentTime);
    if (b % 4 === 1 && Math.random() < 0.5) this.burst(6000, 1, 0.03, 0.015, this.musicVoice, t - c.currentTime, undefined, 'highpass');
  }

  /** Rádio do bar: acordes sincopados filtrados como alto-falante pequeno. */
  private radioBeat(b: number, t: number, spb: number) {
    const c = this.ctx!;
    const prog = [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 55, 58, 61, 65]];
    const ch = prog[Math.floor(b / 16) % prog.length]!;
    const pattern = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0];
    const delay = Math.max(0, t - c.currentTime);
    const radioF = c.createBiquadFilter(); radioF.type = 'bandpass'; radioF.frequency.value = 1300; radioF.Q.value = 0.8; radioF.connect(this.musicVoice);
    if (pattern[b % 16]) ch.slice(1).forEach(n => this.tone('triangle', NOTE(n), NOTE(n), spb * 1.4, 0.035, radioF, delay));
    if (b % 8 === 0) this.tone('sine', NOTE(ch[0]!), NOTE(ch[0]!), spb * 3, 0.09, radioF, delay);
    if (b % 8 === 5) this.tone('sine', NOTE(ch[0]! + 7), NOTE(ch[0]! + 7), spb * 2, 0.07, radioF, delay);
    this.burst(7000, 1, 0.025, b % 2 ? 0.012 : 0.02, radioF, delay, undefined, 'highpass');
  }
}

export const audio = new AudioEngine();
