import { expect, type Page } from '@playwright/test';

export const SUBMUNDO_KEY = 'submundo_brasil_v01';

export async function boot(page: Page, query = '') {
  await page.goto(`/?e2e=1${query}`);
  await page.waitForFunction(() => (window as any).__MRPG__?.screen() === 'title', null, { timeout: 45_000 });
}

export const st = (page: Page) => page.evaluate(() => (window as any).__MRPG__.state());
export const player = (page: Page) => page.evaluate(() => (window as any).__MRPG__.player());

export async function newCareer(page: Page, name = 'Dandara', city = 'Rio de Janeiro') {
  await page.getByRole('button', { name: /Começar nova carreira|Nova carreira/ }).click();
  await page.fill('#cName', name);
  await page.selectOption('#cCity', city);
  await page.getByRole('button', { name: 'Começar', exact: true }).click();
  await page.waitForFunction(() => (window as any).__MRPG__.player() !== null, null, { timeout: 20_000 });
}

/** Avança falas até aparecer uma escolha ou a conversa terminar. */
export async function advance(page: Page, max = 40) {
  for (let i = 0; i < max; i++) {
    const s = await st(page);
    if (!s.story.activeDialogue) return 'end';
    if (await page.locator('.choice:not([disabled])').count()) return 'choice';
    const adv = page.locator('[data-advance]').first();
    if (await adv.count()) await adv.click({ position: { x: 20, y: 20 } }).catch(() => {});
    await page.waitForTimeout(120);
  }
  throw new Error('diálogo não avançou');
}

export async function choose(page: Page, label: RegExp | string) {
  await page.locator('.choice', { hasText: label }).first().click();
  await page.waitForTimeout(150);
}

export async function playThrough(page: Page, picks: Array<RegExp | string>) {
  for (;;) {
    const r = await advance(page);
    if (r === 'end') return;
    const p = picks.shift();
    if (!p) throw new Error('escolha inesperada');
    await choose(page, p);
  }
}

/** Toca/clica num alvo do mapa (o personagem caminha até ele e interage). */
export async function tapTarget(page: Page, id: string, touch = false) {
  const pos = await page.evaluate(i => (window as any).__MRPG__.screenOf(i), id);
  expect(pos, `alvo ${id} visível`).not.toBeNull();
  if (touch) await page.touchscreen.tap(pos.x, pos.y); else await page.mouse.click(pos.x, pos.y);
}

export async function waitDialogue(page: Page, sceneId: string, timeout = 15_000) {
  await page.waitForFunction(id => (window as any).__MRPG__.state()?.story.activeDialogue?.sceneId === id, sceneId, { timeout });
}

export async function walkToAndTalk(page: Page, id: string, sceneId: string, touch = false) {
  const vp = page.viewportSize()!;
  for (let i = 0; i < 8; i++) {
    const pos = await page.evaluate(t => (window as any).__MRPG__.screenOf(t), id);
    if (pos && (pos.x < 24 || pos.x > vp.width - 24)) {
      // Alvo fora da tela: toca no chão na direção dele e deixa o personagem andar.
      const pl = await page.evaluate(() => { const w = (window as any).__MRPG__; const p = w.player(); return p; });
      if (touch) { await joystick(page, pos.x < 24 ? -1 : 1, 0, 1400); continue; }
      const y = Math.min(vp.height - 140, Math.max(200, vp.height * 0.72));
      await page.mouse.click(pos.x < 24 ? 30 : vp.width - 30, y);
      await page.waitForTimeout(1600);
      void pl;
      continue;
    }
    await tapTarget(page, id, touch);
    try { await waitDialogue(page, sceneId, 8000); return; } catch { /* tenta de novo (câmera moveu) */ }
  }
  throw new Error(`não chegou em ${id}`);
}

/** Arrasta o joystick virtual (zona inferior esquerda) por um tempo. */
export async function joystick(page: Page, dx: number, dy: number, ms: number) {
  const vp = page.viewportSize()!;
  const ox = vp.width * 0.22, oy = vp.height * 0.8;
  await page.mouse.move(ox, oy);
  await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(ox + dx * 12 * i, oy + dy * 12 * i);
  await page.waitForTimeout(ms);
  await page.mouse.up();
  await page.waitForTimeout(150);
}
