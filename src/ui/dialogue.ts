/**
 * Caixa de diálogo. Lê o nó ativo do store (persistido) e despacha avanço/escolha.
 * Recarregar a página durante um diálogo reabre exatamente o mesmo nó.
 */
import type { Store, Result } from '../core/store';
import { getNode, getScene, nodeText, visibleChoices } from '../narrative/engine';
import type { DialogueNode, Speaker } from '../narrative/types';
import { esc } from './dom';
import { CARD_ART } from '../art/assets';

export const SPEAKER_NAMES: Record<string, string> = {
  magrao: 'Breno “Magrão”', lia: 'Lia', solange: 'Dona Solange', miro: 'Miro Ferrugem', nando: 'Nando', ze: 'Seu Zé'
};

export interface DialogueDeps {
  store: Store;
  portrait: (speaker: Speaker) => string | null;
  reducedMotion: () => boolean;
  sfx: (name: string) => void;
  onResult: (r: Result) => void;
}

export class DialogueView {
  private root: HTMLElement;
  private key = '';
  private typing = 0;
  private full = '';
  private textEl: HTMLElement | null = null;
  private pendingSay: string | null = null;
  private phoneShown = 0;
  private phoneTimer = 0;
  private busyUntil = 0;

  constructor(parent: HTMLElement, private d: DialogueDeps) {
    this.root = document.createElement('div');
    this.root.className = 'dlg-root hidden';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', 'Conversa');
    parent.appendChild(this.root);
    this.root.addEventListener('click', e => this.onClick(e));
  }

  get open() { return !this.root.classList.contains('hidden'); }

  render(force = false) {
    const s = this.d.store.get();
    const a = s?.story.activeDialogue;
    if (!s || !a) { this.close(); return; }
    const node = getNode(a.sceneId, a.nodeId);
    if (!node) { this.close(); return; }
    const key = `${a.sceneId}/${a.nodeId}/${this.pendingSay ?? ''}`;
    if (key === this.key && !force) { this.refreshChoices(); return; }
    this.key = key;
    this.root.classList.remove('hidden');
    clearInterval(this.typing); clearTimeout(this.phoneTimer);
    if (this.pendingSay) { this.renderLine('player', this.pendingSay, [], true); return; }
    if (node.style === 'card') return this.renderCard(nodeText(s, node), node.art);
    if (node.style === 'phone') return this.renderPhone(node);
    const choices = visibleChoices(s, node);
    this.renderLine(node.speaker, nodeText(s, node), choices, false, node);
  }

  private speakerName(sp: Speaker) {
    if (sp === 'player') return this.d.store.get()?.rpg.name ?? 'Você';
    if (sp === 'narrator') return '';
    return SPEAKER_NAMES[sp] ?? sp;
  }

  private renderLine(sp: Speaker, text: string, choices: ReturnType<typeof visibleChoices>, isSay: boolean, node?: DialogueNode) {
    const s = this.d.store.get()!;
    const scene = getScene(s.story.activeDialogue!.sceneId);
    const narrator = sp === 'narrator';
    const portrait = narrator ? null : this.d.portrait(sp);
    const loc = scene?.location ? `<small>${esc(scene.location)}</small>` : '';
    this.root.innerHTML = `<div class="dialogue"><div class="dlg ${narrator ? 'narrator' : ''}" data-advance="1">
      ${portrait ? `<img class="portrait" alt="" src="${portrait}">` : ''}
      <div><div class="speaker">${narrator ? (scene?.title ? esc(scene.title) : '') : esc(this.speakerName(sp))}${loc}</div>
      <div class="text ${isSay ? 'say' : ''}" aria-live="polite"></div></div>
      ${choices.length ? `<div class="choices" role="group" aria-label="Escolhas">${choices.map((c, i) => `<button type="button" class="choice" data-choice="${esc(c.choice.id)}" ${c.enabled ? '' : 'disabled aria-disabled="true"'}><span class="n">${i + 1}</span><span>${esc(c.choice.label)}${!c.enabled && c.choice.requiresLabel ? `<span class="req">${esc(c.choice.requiresLabel)}</span>` : ''}</span></button>`).join('')}</div>`
        : `<div class="more"><span>${scene?.once ? '' : 'Esc encerra a conversa'}</span><span>Toque ou Espaço ▸</span></div>`}
    </div></div>`;
    this.textEl = this.root.querySelector('.text');
    this.typeText(text);
    void node;
    if (choices.length) this.busyUntil = performance.now() + 250; // evita toque acidental herdado do avanço anterior
  }

  private typeText(text: string) {
    this.full = text;
    if (!this.textEl) return;
    if (this.d.reducedMotion() || text.length < 2) { this.textEl.textContent = text; this.typing = 0; return; }
    let i = 0;
    this.textEl.textContent = '';
    const step = Math.max(1, Math.round(text.length / 60));
    this.typing = window.setInterval(() => {
      i = Math.min(text.length, i + step);
      if (this.textEl) this.textEl.textContent = text.slice(0, i);
      if (i % 6 === 0) this.d.sfx('type');
      if (i >= text.length) { clearInterval(this.typing); this.typing = 0; }
    }, 22);
  }

  private finishTyping(): boolean {
    if (!this.typing) return false;
    clearInterval(this.typing); this.typing = 0;
    if (this.textEl) this.textEl.textContent = this.full;
    return true;
  }

  private renderCard(text: string, art?: string) {
    this.root.innerHTML = `<div class="card" data-advance="1"><div class="cart" aria-hidden="true"></div><div class="ctext"></div><div class="tap">Toque ou Espaço para continuar</div></div>`;
    (this.root.querySelector('.ctext') as HTMLElement).textContent = text;
    const url = art ? CARD_ART[art] : undefined;
    const bg = this.root.querySelector('.cart') as HTMLElement;
    if (url) bg.style.backgroundImage = `url("${url}")`; else bg.remove();
    this.d.sfx('card');
  }

  private renderPhone(node: DialogueNode) {
    const msgs = node.phone ?? [];
    this.root.innerHTML = `<div class="phone" data-advance="1"><div class="device"><div class="ptitle"></div><div class="msgs"></div><div class="tap">Toque para continuar</div></div></div>`;
    (this.root.querySelector('.ptitle') as HTMLElement).textContent = node.text;
    const box = this.root.querySelector('.msgs') as HTMLElement;
    this.phoneShown = 0;
    const show = () => {
      const m = msgs[this.phoneShown];
      if (!m) return;
      const b = document.createElement('div');
      b.className = `bubble ${m.from}`;
      b.textContent = m.text;
      if (m.time) { const t = document.createElement('time'); t.textContent = m.who ? `${m.who} · ${m.time}` : m.time; b.appendChild(t); }
      box.appendChild(b);
      this.phoneShown++;
      this.d.sfx('phone');
      if (this.phoneShown < msgs.length) this.phoneTimer = window.setTimeout(show, this.d.reducedMotion() ? 0 : 650);
    };
    if (this.d.reducedMotion()) { while (this.phoneShown < msgs.length) show(); } else show();
    this.full = String(msgs.length);
  }

  private onClick(e: Event) {
    const t = e.target as HTMLElement;
    const c = t.closest('[data-choice]') as HTMLButtonElement | null;
    if (c) { if (!c.disabled) this.choose(c.dataset.choice!); return; }
    if (t.closest('[data-advance]')) this.advance();
  }

  /** Avança: completa a digitação, depois segue para o próximo nó. */
  advance() {
    const s = this.d.store.get();
    const a = s?.story.activeDialogue;
    if (!s || !a) return;
    if (this.finishTyping()) return;
    const node = getNode(a.sceneId, a.nodeId);
    if (node?.style === 'phone' && this.phoneShown < (node.phone?.length ?? 0)) {
      clearTimeout(this.phoneTimer);
      const all = node.phone!;
      const box = this.root.querySelector('.msgs');
      while (this.phoneShown < all.length && box) {
        const m = all[this.phoneShown]!; const b = document.createElement('div'); b.className = `bubble ${m.from}`; b.textContent = m.text;
        if (m.time) { const tt = document.createElement('time'); tt.textContent = m.who ? `${m.who} · ${m.time}` : m.time; b.appendChild(tt); }
        box.appendChild(b); this.phoneShown++;
      }
      return;
    }
    if (this.pendingSay) { this.pendingSay = null; this.render(true); return; }
    if (node && visibleChoices(s, node).length) return; // precisa escolher
    this.d.sfx('ui');
    const r = this.d.store.dispatch({ type: 'story/advance', nodeId: a.nodeId });
    this.d.onResult(r);
  }

  choose(choiceId: string) {
    if (performance.now() < this.busyUntil) return;
    const s = this.d.store.get();
    const a = s?.story.activeDialogue;
    if (!s || !a) return;
    this.finishTyping();
    const node = getNode(a.sceneId, a.nodeId);
    const choice = node?.choices?.find(c => c.id === choiceId);
    const r = this.d.store.dispatch({ type: 'story/choose', nodeId: a.nodeId, choiceId });
    if (r.ok) {
      this.d.sfx('choice');
      if (choice?.say && this.d.store.get()?.story.activeDialogue) this.pendingSay = choice.say;
    } else this.d.sfx('error');
    this.d.onResult(r);
  }

  chooseIndex(i: number) {
    const b = this.root.querySelectorAll<HTMLButtonElement>('[data-choice]')[i];
    if (b && !b.disabled) this.choose(b.dataset.choice!);
  }

  private refreshChoices() { /* estado de requisitos não muda durante a cena */ }

  close() {
    clearInterval(this.typing); clearTimeout(this.phoneTimer);
    this.typing = 0; this.key = ''; this.pendingSay = null;
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  focusFirst() { (this.root.querySelector('.choice:not([disabled])') as HTMLElement | null)?.focus(); }
}
