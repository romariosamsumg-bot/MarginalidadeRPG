/**
 * Controlador da interface: telas (carregamento, título, criação, jogo), HUD, controles
 * de toque, menu de RPG, diálogo, modais, salvamento/exportação e recuperação de erros.
 */
import { Store, type Action, type Result } from '../core/store';
import type { GameState, Appearance } from '../core/state';
import { HOME_CITIES, CAREERS, MAXDAY } from '../core/legacy/data';
import { seasonSummary } from '../core/legacy/actions';
import { format } from '../core/legacy/util';
import { backupCurrent, clearSave, exportFileName, exportPayload, loadSave, parseImport, readCorrupt, safeStorage, writeSave, MAX_IMPORT_BYTES, type KV, type LoadResult } from '../persistence/storage';
import { loadSettings, prefersReducedMotion, saveSettings, type Settings } from '../persistence/settings';
import { Bridge } from '../game/bridge';
import { setContext } from '../game/context';
import { input, installKeyboard } from '../game/input';
import { artScaleFor, createGame, hasCanvasSupport, type GameHandle } from '../game/Game';
import { audio } from '../audio/audio';
import { currentObjective, missionById } from '../narrative/content/campaign';
import { getScene } from '../narrative/engine';
import { introPending, interactionLabel, resolveInteraction, type TargetId } from '../narrative/triggers';
import type { PanelId, Speaker } from '../narrative/types';
import { AREAS } from '../world/layout';
import { NPC_LOOKS, PLAYER_LOOKS, paintPortrait } from '../art/characters';
import { renderPanel, TABS } from './panels';
import { DialogueView } from './dialogue';
import { $, btn, esc, trapFocus } from './dom';

export const VERSION = '0.1.0';
type Screen = 'loading' | 'title' | 'create' | 'play' | 'fallback';

const ICON = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 5M22 9l-5 5"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

export class App {
  kv: KV | null = safeStorage();
  settings: Settings = loadSettings(this.kv);
  store = new Store(s => writeSave(this.kv, s));
  bridge = new Bridge();
  handle: GameHandle | null = null;
  screen: Screen = 'loading';
  menuTab: PanelId | null = null;
  modalOpen = false;
  portraits: Record<string, string> = {};
  loadResult: LoadResult = { status: 'empty', state: null };
  ui = $('#ui')!;
  dialogue!: DialogueView;
  private renderQueued = false;
  private lastAction = { key: '', t: 0 };
  private prevMissions = '';
  private target: { id: TargetId; label: string } | null = null;
  private coarse = matchMedia('(pointer: coarse)').matches;
  private fpsEl: HTMLElement | null = null;

  start() {
    this.applyDocSettings();
    this.loadResult = loadSave(this.kv);
    if (this.loadResult.state) this.store.hydrate(this.loadResult.state);
    setContext({ store: this.store, bridge: this.bridge, settings: () => this.settings, reducedMotion: () => this.reducedMotion(), artScale: artScaleFor(this.settings.quality) });
    this.buildSkeleton();
    this.dialogue = new DialogueView(this.ui, {
      store: this.store,
      portrait: sp => this.portraitFor(sp),
      reducedMotion: () => this.reducedMotion(),
      sfx: n => audio.sfx(n),
      onResult: r => this.afterStory(r)
    });
    this.wireBridge();
    this.wireInput();
    this.store.subscribe((_s, a, r) => this.onStore(a, r));
    this.installErrorHandlers();
    this.showLoading();
    this.bootGame();
    this.prevMissions = this.missionSig();
  }

  reducedMotion() { return prefersReducedMotion(this.settings); }

  private applyDocSettings() {
    document.documentElement.classList.toggle('large-text', this.settings.largeText);
    document.documentElement.classList.toggle('reduced-motion', this.reducedMotion());
  }

  /* --------------------------------- Boot --------------------------------- */

  private bootGame() {
    const params = new URLSearchParams(location.search);
    const forceCanvas = params.get('renderer') === 'canvas';
    if (params.get('renderer') === 'none' || !hasCanvasSupport()) { this.enterFallback('Este navegador não oferece a área de desenho (Canvas) necessária para o mapa.'); return; }
    createGame($('#game')!, () => this.settings.quality, forceCanvas, (label, p) => this.progress(label, p))
      .then(handle => {
        this.handle = handle;
        this.makePortraits();
        this.progress('Pronto', 1);
        handle.resize();
        handle.startWorld({ area: 'vila', mode: 'attract' });
        this.showTitle();
        this.installDebugHook();
      })
      .catch(err => {
        console.error('[jogo] falha ao iniciar gráficos', err);
        this.enterFallback('Não foi possível iniciar os gráficos do mapa neste aparelho (WebGL/Canvas indisponível ou bloqueado).');
      });
  }

  private makePortraits() {
    PLAYER_LOOKS.forEach((p, i) => { this.portraits[`player${i}`] = paintPortrait(p, 160).toDataURL('image/png'); });
    for (const [id, spec] of Object.entries(NPC_LOOKS)) if (!id.startsWith('ped')) this.portraits[id] = paintPortrait(spec, 160).toDataURL('image/png');
  }

  private portraitFor(sp: Speaker): string | null {
    if (sp === 'narrator') return null;
    if (sp === 'player') return this.portraits[`player${this.store.get()?.profile.appearance ?? 0}`] ?? null;
    return this.portraits[sp] ?? null;
  }

  /* ------------------------------- Esqueleto ------------------------------- */

  private buildSkeleton() {
    this.ui.innerHTML = `
      <div id="scr" class="screen-host"></div>
      <div id="hud" class="hidden">
        <div class="hud-top">
          <div class="who"><img id="hudPortrait" alt=""><div class="meta"><strong id="hudName"></strong>
            <div class="minibars"><div class="mb"><span>ENERGIA</span><i><b id="hudEnergy"></b></i></div><div class="mb heat"><span>PRESSÃO</span><i><b id="hudHeat"></b></i></div></div></div></div>
          <div class="objective" id="hudObjective" role="status" aria-live="polite"><div class="eyebrow" id="hudMission"></div><p id="hudObjText"></p></div>
          <div class="hud-buttons">
            <button class="iconbtn" id="btnSound" type="button" aria-label="Som"></button>
            <button class="iconbtn" id="btnMenu" type="button" aria-label="Abrir menu (M)">${ICON.menu}</button>
          </div>
        </div>
        <div class="clock" id="hudClock"></div>
        <div class="joy-zone" id="joyZone" aria-hidden="true"><div class="joy idle hidden" id="joy"><div class="knob" id="knob"></div></div></div>
        <div class="joy-hint hidden" id="joyHint">Arraste para andar</div>
        <div class="interact hidden" id="interact"><div class="label" id="interactLabel"></div><button class="act" type="button" id="btnAct" aria-describedby="interactLabel">Interagir</button></div>
        <div class="keyhint hidden" id="keyhint"></div>
        <div class="fps hidden" id="fps"></div>
      </div>
      <div id="menu" class="hidden"></div>
      <div id="modal" class="hidden"></div>
      <div id="toast" class="toast hidden" role="status" aria-live="polite"></div>
      <div id="err" class="hidden"></div>
      <input type="file" id="importFile" accept=".json,application/json" class="hidden" aria-label="Selecionar arquivo de save">`;
    this.fpsEl = $('#fps');
  }

  private setScreen(html: string, cls: string) {
    const host = $('#scr')!;
    host.innerHTML = html ? `<div class="screen ${cls}">${html}</div>` : '';
  }

  private showLoading() {
    this.screen = 'loading';
    this.setScreen(`<div class="box"><div class="logo">Marginal<span class="slash">/</span>idade</div><div class="logo-sub">RPG · O Preço do Poder</div>
      <div class="bar"><div id="loadBar"></div></div><small id="loadLabel">Preparando</small></div>`, 'loading');
  }
  private progress(label: string, p: number) {
    const b = $('#loadBar'), l = $('#loadLabel');
    if (b) b.style.width = `${Math.round(p * 100)}%`;
    if (l) l.textContent = label;
  }

  /* --------------------------------- Título -------------------------------- */

  showTitle() {
    this.screen = 'title';
    this.syncBlocked();
    $('#hud')!.classList.add('hidden');
    this.dialogue.close();
    this.closeMenu(true);
    const s = this.store.get();
    const lr = this.loadResult;
    const notice = lr.status === 'corrupt'
      ? `<div class="notice error"><strong>O save salvo neste navegador não pôde ser lido.</strong> ${esc(lr.reason || '')} O conteúdo original foi preservado para recuperação. ${btn('Baixar cópia do save danificado', 'dl-corrupt', '', false, 'small ghost')}</div>`
      : lr.status === 'unavailable' ? `<div class="notice error">${esc(lr.reason || 'Armazenamento indisponível.')} Você pode jogar, mas o progresso não será salvo — use Exportar.</div>` : '';
    this.setScreen(`<div class="title-card">
      <div class="logo">Marginal<span class="slash">/</span>idade</div>
      <div class="logo-sub">RPG · O Preço do Poder · v${VERSION}</div>
      <p class="tag">Vila do Dique, Rio de Janeiro. Uma dívida que não é sua. Um amigo que sumiu. Todo império começa com uma escolha.</p>
      ${notice}
      <div class="title-actions">
        ${s ? btn(`Continuar — ${esc(s.rpg.name)} · Temporada ${s.rpg.season}, dia ${s.rpg.day}`, 'continue', '', false, 'primary block') : ''}
        ${btn(s ? 'Nova carreira' : 'Começar nova carreira', 'new', '', false, (s ? '' : 'primary ') + 'block')}
        <div class="row" style="gap:8px;flex-wrap:nowrap">${btn('Importar save', 'import', '', false, 'block ghost')}${btn('Ajustes', 'title-settings', '', false, 'block ghost')}</div>
        ${btn(this.soundLabel(), 'sound-toggle', 'id="titleSound"', false, 'block ghost')}
      </div>
      <p class="title-foot">Obra de ficção: bairros, grupos e pessoas são inventados. Jogo offline: o progresso fica salvo apenas neste navegador, sem conta, nuvem ou multiplayer. Este jogo não lê nem altera saves do Submundo Brasil.</p>
    </div>`, 'title-screen');
    audio.setMusic('none');
    audio.setAmbience('vila', this.settings.rain);
  }

  private soundLabel() {
    if (!audio.supported) return 'Som indisponível neste navegador';
    return this.settings.soundEnabled && audio.enabled && !this.settings.muted ? 'Som ativado — tocar para silenciar' : 'Ativar som';
  }

  /* -------------------------------- Criação -------------------------------- */

  showCreate() {
    this.screen = 'create';
    let look: Appearance = 0, career: string | null = null;
    this.setScreen(`<form class="create-form" id="createForm" novalidate>
      <div class="eyebrow">Nova carreira</div><h1>Quem é você na Vila do Dique?</h1>
      <div class="field"><label for="cName">Nome ou codinome</label><input id="cName" class="input" required minlength="2" maxlength="22" autocomplete="off" placeholder="Como vão te chamar?"></div>
      <div class="field"><label for="cCity">Cidade natal</label><select id="cCity" class="input">${HOME_CITIES.map(c => `<option>${c}</option>`).join('')}</select>
        <div class="hint">Você mora hoje na Vila do Dique (Rio). Se nasceu em outra cidade, a história explica como chegou aqui.</div></div>
      <div class="field"><fieldset><legend>Aparência</legend><div class="looks" role="radiogroup" aria-label="Aparência">
        ${PLAYER_LOOKS.map((_, i) => `<button type="button" class="look" role="radio" aria-checked="${i === 0}" data-look="${i}" aria-label="Aparência ${i + 1}"><img alt="" src="${this.portraits[`player${i}`] ?? ''}"></button>`).join('')}
      </div></fieldset></div>
      <div class="field"><fieldset><legend>Especialização (da v0.4)</legend><div class="careers" role="radiogroup" aria-label="Especialização">
        ${CAREERS.map(c => `<button type="button" class="career" role="radio" aria-checked="false" data-career="${c.id}"><strong>${c.name}</strong><span>${c.desc}</span></button>`).join('')}
        <button type="button" class="career" role="radio" aria-checked="true" data-career=""><strong>Decidir depois</strong><span>Escolha no painel Início, como na v0.4. Vale por temporada.</span></button>
      </div></fieldset></div>
      <div id="cErr" class="notice error hidden" role="alert"></div>
      <div class="row" style="justify-content:space-between">${btn('Voltar', 'back-title', '', false, 'ghost')}<button class="btn primary" type="submit">Começar</button></div>
    </form>`, 'create');
    const form = $('#createForm') as HTMLFormElement;
    form.addEventListener('click', e => {
      const t = e.target as HTMLElement;
      const l = t.closest('[data-look]') as HTMLElement | null;
      if (l) { look = Number(l.dataset.look) as Appearance; form.querySelectorAll('[data-look]').forEach(x => x.setAttribute('aria-checked', String(x === l))); audio.sfx('select'); }
      const c = t.closest('[data-career]') as HTMLElement | null;
      if (c) { career = c.dataset.career || null; form.querySelectorAll('[data-career]').forEach(x => x.setAttribute('aria-checked', String(x === c))); audio.sfx('select'); }
      if (t.closest('[data-action="back-title"]')) this.showTitle();
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = ($('#cName') as HTMLInputElement).value;
      const city = ($('#cCity') as HTMLSelectElement).value;
      const err = $('#cErr')!;
      if (this.store.get() && !(await this.confirm('Substituir carreira?', 'Já existe uma carreira salva neste navegador. Começar uma nova vai substituí-la (uma cópia de segurança interna é mantida).', 'Começar nova', true))) return;
      backupCurrent(this.kv);
      const r = this.store.dispatch({ type: 'game/new', name, city, appearance: look, career });
      if (!r.ok) { err.textContent = r.msg; err.classList.remove('hidden'); audio.sfx('error'); return; }
      this.loadResult = { status: 'ok', state: this.store.get() };
      audio.sfx('confirm');
      this.enterPlay();
    });
    ($('#cName') as HTMLInputElement).focus();
  }

  /* ---------------------------------- Jogo --------------------------------- */

  enterPlay() {
    const s = this.store.get();
    if (!s) return this.showTitle();
    this.screen = this.handle ? 'play' : 'fallback';
    this.setScreen('', '');
    $('#hud')!.classList.remove('hidden');
    this.prevMissions = this.missionSig();
    if (this.handle) this.handle.startWorld({ area: s.world.area, mode: 'play' });
    if (introPending(s) && !s.story.activeDialogue) this.store.dispatch({ type: 'story/start', sceneId: 'A1-intro' });
    this.renderAll();
    if (this.screen === 'fallback') this.renderPlaces();
    if (this.coarse) { $('#joy')!.classList.remove('hidden'); $('#joyHint')!.classList.remove('hidden'); }
    this.updateAudioScene();
  }

  private syncBlocked() {
    input.blocked = this.screen !== 'play' || this.menuTab !== null || this.modalOpen || this.dialogue?.open === true;
    if (input.blocked) { input.joyX = 0; input.joyY = 0; this.resetJoy(); }
  }

  private onStore(a: Action | null, r: Result | null) {
    if (a?.type === 'world/move') return;
    const sig = this.missionSig();
    if (sig !== this.prevMissions) {
      const s = this.store.get();
      if (s) for (const [id, m] of Object.entries(s.story.missions)) {
        if (m.status === 'completed' && !this.prevMissions.includes(`${id}:completed`)) {
          this.toast(`Missão concluída: ${missionById(id)?.title ?? id}`);
          audio.sfx('reward');
        }
      }
      this.prevMissions = sig;
    }
    void r;
    this.queueRender();
  }

  private missionSig() {
    const s = this.store.get();
    return s ? Object.entries(s.story.missions).map(([k, v]) => `${k}:${v.status}`).join('|') : '';
  }

  private queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => { this.renderQueued = false; this.renderAll(); });
  }

  renderAll() {
    const s = this.store.get();
    if (!s || (this.screen !== 'play' && this.screen !== 'fallback')) { this.syncBlocked(); return; }
    this.renderHud(s);
    this.dialogue.render();
    if (this.menuTab) this.renderMenu();
    if (this.screen === 'fallback') this.renderPlaces();
    this.syncBlocked();
    this.updateInteract();
    this.updateAudioScene();
  }

  private renderHud(s: GameState) {
    ($('#hudPortrait') as HTMLImageElement).src = this.portraits[`player${s.profile.appearance}`] ?? '';
    $('#hudName')!.textContent = s.rpg.name;
    $('#hudEnergy')!.style.width = `${s.rpg.energy}%`;
    $('#hudHeat')!.style.width = `${s.rpg.heat}%`;
    $('#hudEnergy')!.parentElement!.parentElement!.setAttribute('title', `Energia ${s.rpg.energy}/100`);
    $('#hudHeat')!.parentElement!.parentElement!.setAttribute('title', `Pressão policial ${s.rpg.heat}/100`);
    const obj = currentObjective(s.story);
    const box = $('#hudObjective')!;
    box.classList.toggle('future', !!obj?.future);
    $('#hudMission')!.textContent = obj ? `${obj.missionId} · ${obj.title}` : 'Livre';
    $('#hudObjText')!.textContent = obj ? obj.objective : 'Explore a Vila e evolua sua carreira.';
    $('#hudClock')!.textContent = `${s.story.clock.label.toUpperCase()} · T${s.rpg.season} DIA ${s.rpg.day}/${MAXDAY}`;
    const sb = $('#btnSound')!;
    const on = this.settings.soundEnabled && audio.enabled && !this.settings.muted;
    sb.innerHTML = on ? ICON.sound : ICON.mute;
    sb.setAttribute('aria-label', on ? 'Silenciar som' : 'Ativar som');
    sb.setAttribute('aria-pressed', String(on));
  }

  private updateInteract() {
    const box = $('#interact')!, hint = $('#keyhint')!;
    const show = this.screen === 'play' && !input.blocked && !!this.target;
    if (!show) { box.classList.add('hidden'); hint.classList.add('hidden'); return; }
    $('#interactLabel')!.textContent = this.target!.label;
    if (this.coarse) { box.classList.remove('hidden'); hint.classList.add('hidden'); }
    else { box.classList.remove('hidden'); hint.classList.remove('hidden'); hint.innerHTML = `<kbd>E</kbd>${esc(this.target!.label)}`; ($('#interactLabel') as HTMLElement).classList.add('hidden'); }
    if (this.coarse) ($('#interactLabel') as HTMLElement).classList.remove('hidden');
  }

  private updateAudioScene() {
    const s = this.store.get();
    if (this.screen === 'title' || this.screen === 'loading') return;
    const a = s?.story.activeDialogue;
    const scene = a ? getScene(a.sceneId) : null;
    const area = s?.world.area ?? 'vila';
    audio.setAmbience(area, this.settings.rain && area === 'vila');
    audio.setMusic(scene?.music === 'theme' ? 'theme' : area === 'bar' ? 'radio' : 'none');
  }

  private afterStory(r: Result) {
    if (!r.ok && r.msg) this.toast(r.msg, true);
    if (r.openPanel) this.openMenu(r.openPanel);
    this.queueRender();
  }

  /* --------------------------------- Menu --------------------------------- */

  openMenu(tab: PanelId) {
    if (!this.store.get() && tab !== 'ajustes') return;
    const was = this.menuTab;
    this.menuTab = tab;
    if (!was) audio.sfx('open');
    this.handle?.world()?.savePosition();
    this.renderMenu(true);
    this.syncBlocked();
  }

  closeMenu(silent = false) {
    if (!this.menuTab) return;
    this.menuTab = null;
    const m = $('#menu')!; m.classList.add('hidden'); m.innerHTML = '';
    if (!silent) audio.sfx('close');
    this.syncBlocked();
    this.updateInteract();
    ($('#btnMenu') as HTMLElement | null)?.focus({ preventScroll: true });
  }

  private renderMenu(focus = false) {
    const m = $('#menu')!;
    const s = this.store.get();
    const tab = this.menuTab!;
    const bodyOld = m.querySelector('.sheet-body') as HTMLElement | null;
    const scroll = bodyOld?.dataset.tab === tab ? bodyOld.scrollTop : 0;
    const keep: Record<string, string> = {};
    m.querySelectorAll<HTMLInputElement>('input.input').forEach(i => { if (i.id) keep[i.id] = i.value; });
    const tabs = s ? TABS : TABS.filter(t => t.id === 'ajustes');
    m.innerHTML = `<div class="sheet-wrap" data-close-bg="1"><aside class="sheet" role="dialog" aria-modal="true" aria-label="Menu do jogo">
      <div class="sheet-head"><div class="t"><strong>${s ? esc(s.rpg.name) : 'Ajustes'}</strong><small>${s ? `TEMPORADA ${s.rpg.season} · DIA ${s.rpg.day}/${MAXDAY} · ${esc(s.story.clock.label.toUpperCase())}` : 'MARGINALIDADE RPG'}</small></div>
        ${s ? `<div class="money"><b>${format(s.rpg.cash)}</b><span>banco ${format(s.rpg.bank)}</span></div>` : ''}
        <button class="iconbtn" type="button" data-action="close-menu" aria-label="Fechar menu (Esc)">${ICON.close}</button></div>
      <nav class="tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" data-tab="${t.id}" aria-selected="${t.id === tab}">${t.label}</button>`).join('')}</nav>
      <div class="sheet-body" data-tab="${tab}">${s ? renderPanel(tab, s, this.settingsHtml()) : this.settingsHtml()}</div></aside></div>`;
    m.classList.remove('hidden');
    const body = m.querySelector('.sheet-body') as HTMLElement;
    body.scrollTop = scroll;
    for (const [id, v] of Object.entries(keep)) { const i = m.querySelector<HTMLInputElement>(`#${id}`); if (i) i.value = v; }
    if (focus) (m.querySelector('[aria-selected="true"]') as HTMLElement | null)?.focus({ preventScroll: true });
    (m.querySelector('[aria-selected="true"]') as HTMLElement | null)?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  private settingsHtml() {
    const st = this.settings;
    const sw = (key: keyof Settings, label: string, desc = '') => `<div class="setting"><label for="set_${key}">${label}${desc ? `<span class="desc">${desc}</span>` : ''}</label><input type="checkbox" class="switch" id="set_${key}" data-setting="${key}" ${st[key] ? 'checked' : ''}></div>`;
    const range = (key: 'musicVolume' | 'sfxVolume' | 'ambienceVolume', label: string) => `<div class="setting"><label for="set_${key}">${label}</label><input type="range" min="0" max="100" step="5" id="set_${key}" data-setting="${key}" value="${Math.round(st[key] * 100)}"></div>`;
    const s = this.store.get();
    return `<div class="eyebrow">Configurações</div><h1>Ajustes</h1>
      <p class="lead">Preferências ficam salvas neste navegador, separadas da carreira.</p>
      <section class="box"><h2>Som</h2>
        ${audio.supported ? `<div class="setting"><label>Áudio sintetizado<span class="desc">${audio.enabled ? 'Ligado por você.' : 'Navegadores só permitem som após um toque ou clique.'}</span></label>${btn(this.settings.soundEnabled && audio.enabled ? (this.settings.muted ? 'Retirar mudo' : 'Silenciar') : 'Ativar som', 'sound-toggle', '', false, 'small primary')}</div>
        ${range('musicVolume', 'Música')}${range('sfxVolume', 'Efeitos')}${range('ambienceVolume', 'Ambiente')}` : '<p>Este navegador não suporta Web Audio. O jogo funciona normalmente sem som.</p>'}</section>
      <section class="box" style="margin-top:10px"><h2>Imagem e desempenho</h2>
        <div class="setting"><label for="set_quality">Qualidade gráfica<span class="desc">Baixa reduz resolução interna, partículas e brilhos. Nitidez dos personagens muda após recarregar.</span></label>
          <select id="set_quality" data-setting="quality"><option value="baixa" ${st.quality === 'baixa' ? 'selected' : ''}>Baixa</option><option value="padrao" ${st.quality === 'padrao' ? 'selected' : ''}>Padrão</option><option value="alta" ${st.quality === 'alta' ? 'selected' : ''}>Alta</option></select></div>
        ${sw('rain', 'Chuva', 'Efeito visual e sonoro opcional (desligado na qualidade baixa).')}
        <div class="setting"><label for="set_reducedMotion">Movimento reduzido<span class="desc">Automático segue a preferência do sistema.</span></label>
          <select id="set_reducedMotion" data-setting="reducedMotion"><option value="auto" ${st.reducedMotion === 'auto' ? 'selected' : ''}>Automático</option><option value="on" ${st.reducedMotion === 'on' ? 'selected' : ''}>Ligado</option><option value="off" ${st.reducedMotion === 'off' ? 'selected' : ''}>Desligado</option></select></div>
        ${sw('largeText', 'Texto grande')}
        ${sw('showFps', 'Mostrar FPS', 'Medição real do navegador, para diagnóstico.')}
        <p class="mini">Renderizador: ${this.handle ? (this.handle.renderer === 'webgl' ? 'WebGL' : 'Canvas (modo de compatibilidade)') : 'indisponível — modo painéis'}.</p></section>
      ${s ? `<section class="box" style="margin-top:10px"><h2>Salvamento</h2><p>Salvo automaticamente só neste navegador. Exporte para levar a outro aparelho.</p>
        <div class="row" style="justify-content:flex-start">${btn('Exportar carreira', 'export', '', false, 'small')}${btn('Importar carreira', 'import', '', false, 'small ghost')}${btn('Voltar ao título', 'to-title', '', false, 'small ghost')}</div></section>` : ''}
      <p class="footer-note">Marginalidade RPG v${VERSION} · obra de ficção · offline, sem contas, sem compras, sem multiplayer. Controles: WASD/setas para andar, E ou Espaço para interagir, Esc para fechar, M para o menu. No celular: arraste no canto inferior esquerdo e toque em Interagir — ou toque direto em pessoas e lugares.</p>`;
  }

  /* ------------------------------- Ações ------------------------------- */

  private runAction(a: Action, key: string): Result | null {
    const now = performance.now();
    if (this.lastAction.key === key && now - this.lastAction.t < 350) return null; // clique duplo acidental
    this.lastAction = { key, t: now };
    const r = this.store.dispatch(a);
    if (r.msg) this.toast(r.msg, !!r.error);
    audio.sfx(!r.ok ? 'error' : r.error ? 'error' : a.type === 'rpg/nextDay' ? 'transition' : 'confirm');
    return r;
  }

  private async handleAction(el: HTMLElement) {
    const act = el.dataset.action!, id = el.dataset.id ?? '';
    const key = `${act}:${id}:${el.dataset.choice ?? ''}:${el.dataset.mode ?? ''}`;
    switch (act) {
      case 'continue': audio.sfx('confirm'); this.enterPlay(); return;
      case 'new': audio.sfx('ui'); this.showCreate(); return;
      case 'import': $('#importFile')!.click(); return;
      case 'title-settings': this.openMenu('ajustes'); return;
      case 'sound-toggle': await this.toggleSound(); return;
      case 'close-menu': this.closeMenu(); return;
      case 'to-title': this.handle?.world()?.savePosition(); this.closeMenu(true); this.handle?.startWorld({ area: 'vila', mode: 'attract' }); this.showTitle(); return;
      case 'dl-corrupt': { const raw = readCorrupt(this.kv); if (raw) this.download(raw, 'marginalidade-rpg-save-danificado.json'); return; }
      case 'export': this.exportSave(); return;
      case 'reset': await this.resetAll(); return;
      case 'tab': this.openMenu(el.dataset.tab as PanelId); return;
      case 'career': this.runAction({ type: 'rpg/career', id }, key); return;
      case 'goal': this.runAction({ type: 'rpg/goal', id }, key); return;
      case 'news': this.runAction({ type: 'rpg/news', id, index: Number(el.dataset.choice) }, key); return;
      case 'skip-news': this.runAction({ type: 'rpg/skipNews' }, key); return;
      case 'influence': this.runAction({ type: 'rpg/influence', mode: id === 'dispute' ? 'dispute' : 'contact' }, key); return;
      case 'gig': this.runAction({ type: 'rpg/gig' }, key); return;
      case 'laylow': this.runAction({ type: 'rpg/layLow' }, key); return;
      case 'mission': this.runAction({ type: 'rpg/mission', id }, key); return;
      case 'train': this.runAction({ type: 'rpg/train', id }, key); return;
      case 'travel': this.runAction({ type: 'rpg/travel', id }, key); return;
      case 'buy': this.runAction({ type: 'rpg/buy', id }, key); return;
      case 'next-day': this.runAction({ type: 'rpg/nextDay' }, key); return;
      case 'upgrade': this.runAction({ type: 'rpg/upgrade' }, key); return;
      case 'gang-mission': this.runAction({ type: 'rpg/gangMission' }, key); return;
      case 'f-dialogue': this.runAction({ type: 'rpg/factionDialogue', id }, key); return;
      case 'f-pact': this.runAction({ type: 'rpg/factionPact', id }, key); return;
      case 'f-clash': this.runAction({ type: 'rpg/factionClash', id }, key); return;
      case 'recruit': this.runAction({ type: 'rpg/recruit' }, key); return;
      case 'rally': this.runAction({ type: 'rpg/rally' }, key); return;
      case 'found-gang': this.runAction({ type: 'rpg/foundGang', name: ($('#gangName') as HTMLInputElement | null)?.value ?? '' }, key); return;
      case 'bank': {
        const v = ($('#bankAmount') as HTMLInputElement | null)?.value ?? '';
        const r = this.runAction({ type: 'rpg/bank', mode: el.dataset.mode === 'withdraw' ? 'withdraw' : 'deposit', amount: Number(v) }, key);
        if (r?.ok) { const i = $('#bankAmount') as HTMLInputElement | null; if (i) i.value = ''; }
        return;
      }
      case 'end-season': {
        const s = this.store.get(); if (!s) return;
        const { money, fulfilled, record } = seasonSummary(s.rpg);
        const ok = await this.confirm(`Encerrar a temporada ${s.rpg.season}?`, `Respeito: ${record.respect}\nDinheiro disponível: ${format(money)}\nMeta: ${s.rpg.goal ? (fulfilled ? 'cumprida (+R$ 600 na próxima temporada)' : 'não cumprida') : 'não escolhida'}\n\nA carreira da temporada recomeça; sua história, relações e a Vila continuam.`, 'Encerrar temporada');
        if (ok) this.runAction({ type: 'rpg/endSeason' }, key);
        return;
      }
      case 'place': this.fallbackInteract(id as TargetId); return;
    }
  }

  private async toggleSound() {
    if (!audio.supported) { this.toast('Este navegador não suporta áudio Web Audio.', true); return; }
    if (!this.settings.soundEnabled || !audio.enabled) {
      this.settings.soundEnabled = true; this.settings.muted = false;
      const ok = await audio.enable(this.settings);
      if (!ok) { this.settings.soundEnabled = false; this.toast('Não foi possível ativar o som neste navegador.', true); }
      else { audio.sfx('confirm'); this.updateAudioScene(); if (this.screen === 'title') audio.setAmbience('vila', this.settings.rain); }
    } else {
      this.settings.muted = !this.settings.muted;
      audio.apply(this.settings);
    }
    saveSettings(this.kv, this.settings);
    const t = $('#titleSound'); if (t) t.textContent = this.soundLabel();
    if (this.menuTab) this.renderMenu();
    const s = this.store.get(); if (s && this.screen === 'play') this.renderHud(s);
  }

  private onSettingChange(el: HTMLInputElement | HTMLSelectElement) {
    const key = el.dataset.setting as keyof Settings;
    const st = this.settings as unknown as Record<string, unknown>;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') st[key] = el.checked;
    else if (el instanceof HTMLInputElement && el.type === 'range') st[key] = Number(el.value) / 100;
    else st[key] = el.value;
    saveSettings(this.kv, this.settings);
    audio.apply(this.settings);
    this.applyDocSettings();
    if (key === 'showFps') this.fpsEl?.classList.toggle('hidden', !this.settings.showFps);
    if (key === 'quality' || key === 'rain' || key === 'reducedMotion') {
      this.handle?.resize();
      const w = this.handle?.world();
      if (w) { w.savePosition(); this.handle!.startWorld({ area: w.area, mode: w.mode }); }
      this.updateAudioScene();
      if (key === 'quality') this.toast('Qualidade aplicada. A nitidez dos personagens muda ao recarregar a página.');
    }
  }

  /* --------------------------- Salvar / importar --------------------------- */

  private download(text: string, name: string) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  private exportSave() {
    const s = this.store.get(); if (!s) return;
    this.handle?.world()?.savePosition();
    this.download(JSON.stringify(exportPayload(this.store.get()!, VERSION), null, 2), exportFileName(s));
    this.toast('Cópia da carreira preparada para download.');
  }

  private async importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { this.toast('Arquivo muito grande para ser um save do jogo.', true); return; }
    let text = '';
    try { text = await file.text(); } catch { this.toast('Não foi possível ler o arquivo.', true); return; }
    const r = parseImport(text, file.size);
    if (!r.ok) { this.toast(r.reason, true); audio.sfx('error'); return; }
    const ok = await this.confirm('Importar carreira?', `Carreira “${r.state.rpg.name}”, temporada ${r.state.rpg.season}, dia ${r.state.rpg.day}.\nA carreira atual deste navegador será substituída (uma cópia de segurança interna é mantida).`, 'Importar');
    if (!ok) return;
    backupCurrent(this.kv);
    const res = this.store.dispatch({ type: 'game/replace', state: r.state });
    this.loadResult = { status: 'ok', state: r.state };
    this.toast(res.ok ? 'Carreira importada com sucesso.' : res.msg, !res.ok);
    this.closeMenu(true);
    this.enterPlay();
  }

  private async resetAll() {
    if (!(await this.confirm('Apagar a carreira?', 'Apagar toda a carreira deste navegador? Uma cópia de segurança interna é mantida, mas o progresso some da tela.', 'Continuar', true))) return;
    if (!(await this.confirm('Confirme novamente', 'Deseja realmente excluir o progresso do Marginalidade RPG neste navegador?', 'Excluir', true))) return;
    clearSave(this.kv);
    this.store.hydrate(null);
    this.loadResult = { status: 'empty', state: null };
    this.closeMenu(true);
    this.handle?.startWorld({ area: 'vila', mode: 'attract' });
    this.showTitle();
    this.toast('Progresso apagado. Novo início disponível.');
  }

  /* ------------------------------ Modais/toasts ------------------------------ */

  confirm(title: string, msg: string, okLabel = 'Confirmar', danger = false): Promise<boolean> {
    return new Promise(resolve => {
      const m = $('#modal')!;
      const prev = document.activeElement as HTMLElement | null;
      m.innerHTML = `<div class="modal-wrap"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="mTitle" aria-describedby="mMsg"><h2 id="mTitle"></h2><p id="mMsg"></p>
        <div class="row">${btn('Cancelar', 'm-cancel', '', false, 'ghost')}${btn(esc(okLabel), 'm-ok', '', false, danger ? 'danger' : 'primary')}</div></div></div>`;
      $('#mTitle', m)!.textContent = title; $('#mMsg', m)!.textContent = msg;
      m.classList.remove('hidden'); this.modalOpen = true; this.syncBlocked();
      const done = (v: boolean) => { m.classList.add('hidden'); m.innerHTML = ''; this.modalOpen = false; this.syncBlocked(); m.onclick = null; m.onkeydown = null; prev?.focus?.({ preventScroll: true }); resolve(v); };
      m.onclick = e => { const a = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null; if (a?.dataset.action === 'm-ok') done(true); else if (a?.dataset.action === 'm-cancel' || (e.target as HTMLElement).classList.contains('modal-wrap')) done(false); };
      m.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); done(false); } trapFocus(m, e); };
      ($('[data-action="m-cancel"]', m) as HTMLElement).focus();
      audio.sfx('open');
    });
  }

  private toastTimer = 0;
  toast(msg: string, error = false) {
    if (!msg) return;
    const t = $('#toast')!;
    t.textContent = msg;
    t.className = `toast${error ? ' error' : ''}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => t.classList.add('hidden'), 3600);
  }

  /* ------------------------------- Entrada ------------------------------- */

  private wireInput() {
    installKeyboard({
      interact: () => {
        if (this.modalOpen || this.menuTab) return;
        if (this.dialogue.open) { this.dialogue.advance(); return; }
        if (this.screen === 'play') this.bridge.emit('interact', undefined);
      },
      escape: () => this.escape(),
      menu: () => { if (this.screen === 'play' && !this.dialogue.open && !this.modalOpen) { if (this.menuTab) this.closeMenu(); else this.openMenu('resumo'); } }
    });
    window.addEventListener('keydown', e => {
      if (!this.dialogue.open || this.modalOpen || this.menuTab) return;
      if (/^Digit[1-3]$/.test(e.code)) { this.dialogue.chooseIndex(Number(e.code.slice(5)) - 1); e.preventDefault(); }
      else if (e.code === 'Enter' && !(e.target as HTMLElement)?.closest?.('button')) { this.dialogue.advance(); e.preventDefault(); }
    });
    document.addEventListener('click', e => {
      const t = e.target as HTMLElement;
      const tabBtn = t.closest('[data-tab]') as HTMLElement | null;
      if (tabBtn && tabBtn.getAttribute('role') === 'tab') { audio.sfx('select'); this.openMenu(tabBtn.dataset.tab as PanelId); return; }
      if (t.classList.contains('sheet-wrap')) { this.closeMenu(); return; }
      const a = t.closest('[data-action]') as HTMLElement | null;
      if (a && !(a as HTMLButtonElement).disabled && !a.closest('#modal')) void this.handleAction(a);
    });
    document.addEventListener('change', e => {
      const t = e.target as HTMLElement;
      if (t.id === 'importFile') { const f = (t as HTMLInputElement).files?.[0]; (t as HTMLInputElement).value = ''; void this.importFile(f); return; }
      if (t.dataset.setting) this.onSettingChange(t as HTMLInputElement);
    });
    document.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.dataset.setting && t.type === 'range') this.onSettingChange(t); });
    $('#btnMenu')!.addEventListener('click', () => { if (this.menuTab) this.closeMenu(); else this.openMenu('resumo'); });
    $('#btnSound')!.addEventListener('click', () => void this.toggleSound());
    $('#btnAct')!.addEventListener('click', () => { if (this.dialogue.open) this.dialogue.advance(); else this.bridge.emit('interact', undefined); });
    this.wireJoystick();
    // Som: se o jogador já tinha ativado, o primeiro gesto o religa (política de autoplay).
    const resumeOnGesture = () => {
      if (this.settings.soundEnabled && !audio.enabled) void audio.enable(this.settings).then(() => { this.updateAudioScene(); if (this.screen === 'title') audio.setAmbience('vila', this.settings.rain); });
    };
    window.addEventListener('pointerdown', resumeOnGesture, { capture: true });
    window.addEventListener('keydown', resumeOnGesture, { capture: true });
    document.addEventListener('visibilitychange', () => {
      audio.visibility(document.hidden);
      if (document.hidden) this.handle?.world()?.savePosition();
    });
    window.addEventListener('pagehide', () => this.handle?.world()?.savePosition());
    const onResize = () => { this.handle?.resize(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 250));
    window.visualViewport?.addEventListener('resize', onResize);
    // Impede gestos de rolagem/zoom acidentais fora das áreas roláveis.
    document.addEventListener('touchmove', e => { if (!(e.target as HTMLElement).closest('.sheet-body, .tabs, .screen, .places, .dlg')) e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturestart', e => e.preventDefault());
  }

  private escape() {
    if (this.modalOpen) return;
    if (this.menuTab) { this.closeMenu(); return; }
    if (this.dialogue.open) {
      const r = this.store.dispatch({ type: 'story/dismiss' });
      if (!r.ok && r.msg) this.toast(r.msg);
      return;
    }
    if (this.screen === 'play') this.openMenu('resumo');
  }

  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private wireJoystick() {
    const zone = $('#joyZone')!, joy = $('#joy')!, knob = $('#knob')!;
    const R = 52;
    const setKnob = (dx: number, dy: number) => { knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    zone.addEventListener('pointerdown', e => {
      if (input.blocked || this.joyId !== null) return;
      this.coarse = this.coarse || e.pointerType === 'touch';
      this.joyId = e.pointerId; zone.setPointerCapture(e.pointerId);
      const rect = zone.getBoundingClientRect();
      this.joyOrigin = { x: e.clientX, y: e.clientY };
      joy.style.left = `${e.clientX - rect.left}px`; joy.style.top = `${e.clientY - rect.top}px`;
      joy.classList.remove('hidden', 'idle'); $('#joyHint')!.classList.add('hidden');
      setKnob(0, 0); e.preventDefault();
    });
    zone.addEventListener('pointermove', e => {
      if (e.pointerId !== this.joyId) return;
      let dx = e.clientX - this.joyOrigin.x, dy = e.clientY - this.joyOrigin.y;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      setKnob(dx, dy);
      const m = Math.min(1, d / R);
      const dead = 0.18;
      if (m < dead || input.blocked) { input.joyX = 0; input.joyY = 0; return; }
      const k = (m - dead) / (1 - dead) / Math.max(1e-6, m);
      input.joyX = dx / R * k; input.joyY = dy / R * k;
      e.preventDefault();
    });
    let downAt = 0, moved = 0;
    zone.addEventListener('pointerdown', () => { downAt = performance.now(); moved = 0; }, { capture: true });
    zone.addEventListener('pointermove', e => { if (e.pointerId === this.joyId) moved = Math.max(moved, Math.hypot(e.clientX - this.joyOrigin.x, e.clientY - this.joyOrigin.y)); });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.joyId) return;
      // Toque curto sem arrasto: vale como toque no mapa (pessoas e lugares no canto também respondem).
      if (e.type === 'pointerup' && performance.now() - downAt < 260 && moved < 12) this.handle?.world()?.tapScreen(e.clientX, e.clientY);
      this.resetJoy();
    };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end); zone.addEventListener('lostpointercapture', end);
  }
  private resetJoy() {
    this.joyId = null; input.joyX = 0; input.joyY = 0;
    const joy = $('#joy'), knob = $('#knob');
    if (knob) knob.style.transform = '';
    if (joy && this.coarse) { joy.classList.add('idle'); joy.style.left = '96px'; joy.style.top = 'calc(100% - 110px)'; }
  }

  /* ------------------------------- Ponte ------------------------------- */

  private wireBridge() {
    const b = this.bridge;
    b.on('target', t => { this.target = t; this.updateInteract(); if (t) audio.sfx('select'); });
    b.on('openPanel', tab => { if (this.screen === 'play') this.openMenu(tab as PanelId); });
    b.on('scene', id => {
      const r = this.store.dispatch({ type: 'story/start', sceneId: id });
      if (!r.ok) this.toast(r.msg, true); else audio.sfx('interact');
    });
    b.on('toast', t => this.toast(t.msg, t.error));
    b.on('step', s => audio.step(s.surface));
    b.on('sfx', n => audio.sfx(n));
    b.on('fps', f => { if (this.fpsEl && this.settings.showFps) { this.fpsEl.textContent = `${f} FPS · ${this.handle?.renderer ?? ''}`; this.fpsEl.classList.remove('hidden'); } });
    b.on('transition', () => audio.sfx('transition'));
    b.on('areaReady', () => { this.target = null; this.updateInteract(); this.updateAudioScene(); });
  }

  /* ---------------------- Modo painéis (sem gráficos) ---------------------- */

  private enterFallback(reason: string) {
    this.handle = null;
    this.screen = 'title';
    this.makePortraitsSafe();
    this.showTitle();
    const card = $('.title-card');
    if (card) card.insertAdjacentHTML('afterbegin', `<div class="notice error" role="alert"><strong>Mapa indisponível.</strong> ${esc(reason)} Você ainda pode jogar no <strong>modo painéis</strong>: lugares em lista, diálogos e todos os sistemas de RPG.</div>`);
  }
  private makePortraitsSafe() { try { this.makePortraits(); } catch { /* sem canvas: sem retratos */ } }

  private renderPlaces() {
    const s = this.store.get(); if (!s) return;
    let box = $('#places');
    if (!box) { box = document.createElement('div'); box.id = 'places'; box.className = 'places'; $('#hud')!.appendChild(box); }
    const area = AREAS[s.world.area];
    const items = area.interactables.filter(it => !it.npc || (s.story.npcs[it.npc].present && area.spots[s.story.npcs[it.npc].spot]));
    box.innerHTML = `<div class="eyebrow">Modo painéis · ${s.world.area === 'vila' ? 'Vila do Dique' : 'Bar do Nando'}</div><div class="grid">${items.map(it => btn(esc(interactionLabel(s, it.id, it.name)), 'place', `data-id="${it.id}"`, !!s.story.activeDialogue, 'small block')).join('')}</div>`;
  }

  private fallbackInteract(id: TargetId) {
    const s = this.store.get(); if (!s) return;
    const o = resolveInteraction(s, id);
    if (o.kind === 'door') {
      const sp = o.to === 'bar' ? AREAS.bar.spawns.door! : AREAS.vila.spawns.bar_porta!;
      this.store.dispatch({ type: 'world/move', area: o.to, x: sp.x, y: sp.y, facing: sp.facing });
      const auto = o.to === 'bar' && (s.story.missions['A1-M02']?.stage === 'go_bar' || s.story.missions['A1-M02']?.stage === 'confront') && s.story.missions['A1-M02']?.status === 'active';
      if (auto) this.store.dispatch({ type: 'story/start', sceneId: 'A1-M02-cobranca' });
      this.renderAll();
    } else if (o.kind === 'scene') this.bridge.emit('scene', o.sceneId);
    else if (o.kind === 'panel') this.openMenu(o.tab);
    else this.toast(o.msg);
  }

  /* ------------------------------ Erros e testes ------------------------------ */

  private installErrorHandlers() {
    const show = (msg: string) => {
      console.error('[erro]', msg);
      if (this.screen === 'loading') {
        const e = $('#err')!;
        e.className = 'errorbox';
        e.innerHTML = `<div class="modal"><h2>Algo deu errado ao abrir o jogo</h2><p id="errMsg"></p><div class="row">${btn('Recarregar', 'reload', '', false, 'primary')}</div></div>`;
        $('#errMsg')!.textContent = `${msg}\nSeu progresso salvo não foi alterado.`;
        e.querySelector('[data-action="reload"]')!.addEventListener('click', () => location.reload());
      } else this.toast('Algo deu errado, mas seu progresso está salvo. Se persistir, recarregue a página.', true);
    };
    window.addEventListener('error', e => { if (e.message && !/ResizeObserver/.test(e.message)) show(e.message); });
    window.addEventListener('unhandledrejection', e => show(String((e.reason as Error)?.message ?? e.reason)));
  }

  private installDebugHook() {
    const p = new URLSearchParams(location.search);
    if (!(p.get('e2e') === '1' || import.meta.env.DEV)) return;
    (window as unknown as Record<string, unknown>).__MRPG__ = {
      state: () => this.store.snapshot(),
      screen: () => this.screen,
      player: () => { const w = this.handle?.world(); return w?.player ? { x: w.player.x, y: w.player.y, area: w.area } : null; },
      target: () => this.target,
      renderer: () => this.handle?.renderer,
      audio: () => ({ state: audio.ctx?.state ?? 'none', enabled: audio.enabled, muted: this.settings.muted }),
      menu: () => this.menuTab,
      fps: () => this.handle?.game.loop.actualFps ?? 0,
      /** Posição em px CSS de um alvo do mapa (para testes de toque). */
      screenOf: (id: string) => {
        const w = this.handle?.world(); if (!w) return null;
        const it = (w as unknown as { interactables(): Array<{ id: string; x: number; y: number }> }).interactables().find(i => i.id === id);
        if (!it) return null;
        const cam = w.cameras.main, ds = this.handle!.game.scale.displayScale;
        return { x: (it.x - cam.worldView.x) * cam.zoom / ds.x, y: (it.y - 40 - cam.worldView.y) * cam.zoom / ds.y };
      }
    };
  }
}
