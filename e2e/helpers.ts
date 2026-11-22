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
    if (await page.locator('.mg-root:not(.hidden)').count()) return 'minigame';
    if (await page.locator('.dlg .choice:not([disabled])').count()) return 'choice';
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
    // Desafio no meio da cena: os testes de história pulam (resultado médio); os de mini game jogam.
    if (r === 'minigame') { await page.locator('[data-mg="skip"]').click(); await page.waitForTimeout(200); continue; }
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

/** Toca no alvo (ou no chão na direção dele) e espera a caminhada terminar; repete até `done()`. */
async function approach(page: Page, id: string, touch: boolean, done: () => Promise<boolean>) {
  const vp = page.viewportSize()!;
  for (let i = 0; i < 30; i++) {
    if (await done()) return true;
    // Tocou em outra coisa (ex.: a TV) e abriu uma conversa curta: fecha como o jogador faria.
    if ((await st(page))?.story.activeDialogue || await page.evaluate(() => (window as any).__MRPG__.menu())) { await page.keyboard.press('Escape'); await page.waitForTimeout(200); continue; }
    const pos = await page.evaluate(t => (window as any).__MRPG__.screenOf(t), id);
    const me = await page.evaluate(() => (window as any).__MRPG__.screenOf('player'));
    if (process.env.E2E_DEBUG) console.log('approach', id, i, JSON.stringify(pos), JSON.stringify(await player(page)));
    let x = pos?.x ?? vp.width / 2, y = pos?.y ?? vp.height / 2;
    if (x < 24 || x > vp.width - 24) {
      // Alvo fora da tela: toca na seta do objetivo, se ela apontar para lá; senão, no chão na direção dele.
      const arrow = await page.evaluate(() => (window as any).__MRPG__.screenOf('arrow'));
      const sameSide = arrow && (x < 24) === (arrow.x < vp.width / 2);
      if (sameSide && i % 2 === 0) { x = arrow.x; y = arrow.y; }
      else { x = x < 24 ? 24 : vp.width - 24; y = Math.min(vp.height - 20, Math.max(80, me?.y ?? vp.height * 0.7)); }
    }
    if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    const t0 = Date.now();
    await page.waitForTimeout(300);
    while (Date.now() - t0 < 20_000) {
      if (await done()) return true;
      if (!(await page.evaluate(() => (window as any).__MRPG__.moving()))) break;
      await page.waitForTimeout(250);
    }
  }
  return done();
}

export async function walkToAndTalk(page: Page, id: string, sceneId: string, touch = false) {
  const ok = await approach(page, id, touch, async () => (await st(page))?.story.activeDialogue?.sceneId === sceneId);
  if (!ok) throw new Error(`não chegou em ${id}`);
}

/** Vai até uma porta e espera a troca de área. */
export async function walkToDoor(page: Page, id: string, area: 'vila' | 'bar' | 'casa', touch = false) {
  const ok = await approach(page, id, touch, async () => (await player(page))?.area === area);
  if (!ok) throw new Error(`não entrou em ${area}`);
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


/** Importa um save de e2e/fixtures pelo fluxo real da tela de título. */
export async function importFixture(page: Page, name: string) {
  await page.locator('#importFile').setInputFiles(new URL(`./fixtures/${name}.json`, import.meta.url).pathname);
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.waitForFunction(() => (window as any).__MRPG__.player() !== null, null, { timeout: 30_000 });
  await page.waitForTimeout(800);
}
