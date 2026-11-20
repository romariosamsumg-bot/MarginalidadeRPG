/**
 * Capturas de tela reais do build (npm run preview deve estar rodando em :4173).
 * Uso: node scripts/screenshots.cjs <save-no-bar.json> <save-indo-ao-bar.json>
 */
const { chromium, devices } = require('playwright');
const out = require('node:path').resolve(__dirname, '../docs/screenshots');
const VIEWS = [
  ['360x780', { ...devices['Pixel 5'], viewport: { width: 360, height: 780 } }],
  ['390x844', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }],
  ['768x1024', { viewport: { width: 768, height: 1024 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ['1366x768', { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }]
];
(async () => {
  const [barSave, vilaSave] = process.argv.slice(2);
  const b = await chromium.launch();
  const errors = [];
  for (const [name, opts] of VIEWS) {
    const ctx = await b.newContext({ ...opts, deviceScaleFactor: name === '1366x768' ? 1 : 2 });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(`${name}: ${e.message}`));
    await p.goto('http://localhost:4173/?e2e=1');
    await p.waitForFunction(() => window.__MRPG__?.screen() === 'title', null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${name}-1-titulo.png` });
    await p.getByRole('button', { name: /Começar nova carreira/ }).click();
    await p.fill('#cName', 'Dandara');
    await p.screenshot({ path: `${out}/${name}-2-criacao.png` });
    await p.getByRole('button', { name: 'Começar', exact: true }).click();
    await p.waitForFunction(() => window.__MRPG__.player() !== null);
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${out}/${name}-3-cartao.png` });
    for (let i = 0; i < 16; i++) { const d = await p.evaluate(() => window.__MRPG__.state().story.activeDialogue); if (!d) break; await p.keyboard.press('Space'); await p.waitForTimeout(200); }
    await p.waitForTimeout(1000);
    await p.screenshot({ path: `${out}/${name}-4-vila.png` });
    await p.evaluate(() => 0);
    await p.keyboard.press('KeyE'); // conversa com quem estiver perto (Lia)
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${out}/${name}-5-dialogo.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.locator('#btnMenu').click(); await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${name}-6-menu.png` });
    await p.getByRole('tab', { name: 'Missões' }).click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${name}-7-missoes.png` });
    await p.getByRole('tab', { name: 'História' }).click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/${name}-8-historia.png` });
    await p.getByRole('button', { name: 'Fechar menu (Esc)' }).click();
    // Interior do bar (save sintético pós-A1-M02)
    await p.locator('#importFile').setInputFiles(barSave);
    await p.getByRole('button', { name: 'Importar', exact: true }).click();
    await p.waitForFunction(() => window.__MRPG__.player()?.area === 'bar');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/${name}-9-bar.png` });
    // Vila à noite
    await p.locator('#importFile').setInputFiles(vilaSave);
    await p.getByRole('button', { name: 'Importar', exact: true }).click();
    await p.waitForFunction(() => window.__MRPG__.player()?.area === 'vila');
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${out}/${name}-10-vila-noite.png` });
    const fps = await p.evaluate(() => window.__MRPG__.fps());
    console.log(name, 'fps(headless)=', fps.toFixed(1), 'renderer=', await p.evaluate(() => window.__MRPG__.renderer()));
    await ctx.close();
  }
  console.log(errors.length ? errors.join('\n') : 'sem erros de página');
  await b.close();
})();
