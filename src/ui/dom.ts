/** Utilitários de DOM. Todo texto vindo de estado/save/usuário passa por esc() ou textContent. */

export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T | null;
export const $all = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => Array.from(root.querySelectorAll(sel)) as T[];

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]!);

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}

/** Botão padrão com data-action (sempre type="button"). */
export const btn = (label: string, action: string, extra = '', disabled = false, cls = '') =>
  `<button type="button" class="btn ${cls}" data-action="${esc(action)}" ${extra} ${disabled ? 'disabled' : ''}>${label}</button>`;

/** Foco preso dentro de um diálogo modal enquanto aberto. */
export function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  if (e.key !== 'Tab') return;
  const items = $all<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])', container).filter(x => x.offsetParent !== null);
  if (!items.length) return;
  const first = items[0]!, last = items[items.length - 1]!;
  if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
  else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
}
