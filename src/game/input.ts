/**
 * Estado de entrada unificado: teclado (WASD/setas, E/Espaço, Esc) e toque
 * (joystick virtual + botão Interagir). A cena Phaser apenas lê `moveX/moveY`.
 */
export const input = {
  keys: new Set<string>(),
  joyX: 0,
  joyY: 0,
  /** Verdadeiro quando diálogo/menu/modal está aberto: o personagem não anda. */
  blocked: false,
  get moveX(): number {
    if (this.blocked) return 0;
    const k = (this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? 1 : 0);
    return k !== 0 ? k : this.joyX;
  },
  get moveY(): number {
    if (this.blocked) return 0;
    const k = (this.keys.has('ArrowDown') || this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('ArrowUp') || this.keys.has('KeyW') ? 1 : 0);
    return k !== 0 ? k : this.joyY;
  },
  clear() { this.keys.clear(); this.joyX = 0; this.joyY = 0; }
};

const MOVE_CODES = new Set(['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

function typingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

export function installKeyboard(handlers: { interact: () => void; escape: () => void; menu: () => void }) {
  window.addEventListener('keydown', e => {
    if (typingTarget(e.target)) { if (e.code === 'Escape') handlers.escape(); return; }
    if (MOVE_CODES.has(e.code)) { input.keys.add(e.code); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyE' || (e.code === 'Space' && !(e.target as HTMLElement)?.closest?.('button'))) { e.preventDefault(); handlers.interact(); }
    else if (e.code === 'Escape') { e.preventDefault(); handlers.escape(); }
    else if (e.code === 'KeyM') handlers.menu();
  });
  window.addEventListener('keyup', e => { input.keys.delete(e.code); });
  // Perda de foco: solta tudo para o personagem não "andar sozinho".
  window.addEventListener('blur', () => input.clear());
  document.addEventListener('visibilitychange', () => { if (document.hidden) input.clear(); });
}
