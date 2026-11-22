import { expect, test } from '@playwright/test';
import { advance, boot, choose, importFixture, joystick, newCareer, player, playThrough, st, SUBMUNDO_KEY, waitDialogue, walkToAndTalk, walkToDoor } from './helpers';

const SUBMUNDO_SAVE = JSON.stringify({ schema: 1, name: 'Veterano', city: 'Recife', season: 4, day: 9, cash: 77777 });

test.beforeEach(async ({ page }) => {
  // Um save antigo do Submundo Brasil existe no mesmo domínio: não pode ser lido, alterado nem importado.
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [SUBMUNDO_KEY, SUBMUNDO_SAVE] as const);
});

test('fluxo completo: nova carreira → exploração → conversa → escolha → missão → recarregar → reação persistente', async ({ page }, info) => {
  test.setTimeout(720_000); // ~10 FPS no Chromium headless com GL por software
  const touch = info.project.name.startsWith('mobile');
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  // O save do Submundo não é reconhecido como carreira.
  await expect(page.getByRole('button', { name: /^Continuar/ })).toHaveCount(0);
  await newCareer(page, 'Dandara', 'São Paulo');
  // Introdução (cartões e celular)
  await waitDialogue(page, 'A1-intro');
  await expect(page.locator('.ctext')).toContainText('Você nasceu em São Paulo');
  await playThrough(page, []);
  expect((await st(page)).story.flags.intro_seen).toBe(true);

  // A1-M01: caminhar até Magrão e conversar
  await walkToAndTalk(page, 'magrao', 'A1-M01-oficina', touch);
  await playThrough(page, [/Perguntar o que aconteceu/, /Aceitar mesmo assim/]);
  let s = await st(page);
  expect(s.story.items.encomenda).toBe(true);
  expect(s.story.flags.asked_magrao_truth).toBe(true);
  expect(s.story.flags.oficina_closed).toBe(true);

  // Guardar a caixa em casa — Lia pergunta
  await walkToAndTalk(page, 'casa', 'A1-M01-casa', touch);
  await playThrough(page, [/Contar a verdade/]);
  s = await st(page);
  expect(s.story.missions['A1-M01'].status).toBe('completed');
  expect(s.story.missions['A1-M02']).toEqual({ status: 'active', stage: 'go_bar' });
  expect(s.story.clock.timeOfDay).toBe('noite');

  // Missões únicas não repetem: casa agora abre o painel de descanso, não a cena.
  // A1-M02: entrar no bar (transição de área) → cobrança automática
  await walkToDoor(page, 'bar_porta', 'bar', touch);
  await page.waitForFunction(() => (window as any).__MRPG__.player()?.area === 'bar', null, { timeout: 15_000 });
  await waitDialogue(page, 'A1-M02-cobranca', 20_000);
  const respectBefore = (await st(page)).rpg.respect;
  await advance(page);
  await choose(page, /Enfrentar Miro/);
  // Recarregar NO MEIO do diálogo: deve retomar no mesmo ponto, sem duplicar efeitos.
  const nodeBefore = (await st(page)).story.activeDialogue.nodeId;
  await page.reload();
  await page.waitForFunction(() => (window as any).__MRPG__?.screen() === 'title', null, { timeout: 45_000 });
  await page.getByRole('button', { name: /^Continuar/ }).click();
  await waitDialogue(page, 'A1-M02-cobranca');
  expect((await st(page)).story.activeDialogue.nodeId).toBe(nodeBefore);
  await playThrough(page, [/Negar/]);
  s = await st(page);
  expect(s.story.missions['A1-M02'].status).toBe('completed');
  expect(s.story.flags.miro_first_response).toBe('enfrentar');
  expect(s.rpg.respect).toBe(respectBefore + 3);

  // Recarregar após concluir: reação persistente do Nando e nenhuma recompensa duplicada.
  await page.reload();
  await page.waitForFunction(() => (window as any).__MRPG__?.screen() === 'title', null, { timeout: 45_000 });
  await page.getByRole('button', { name: /^Continuar/ }).click();
  await page.waitForFunction(() => (window as any).__MRPG__.player()?.area === 'bar', null, { timeout: 15_000 });
  expect((await st(page)).rpg.respect).toBe(respectBefore + 3);
  await walkToAndTalk(page, 'nando', 'bark-nando', touch);
  // A primeira fala do Nando depende da resposta dada a Miro (memória narrativa).
  expect((await st(page)).story.activeDialogue.nodeId).toBe('n_e');
  await expect(page.locator('.dlg .text')).toContainText('Ninguém responde o Miro assim');
  await advance(page);
  await choose(page, /Agora não/);

  // Save do Submundo intacto
  expect(await page.evaluate(k => localStorage.getItem(k), SUBMUNDO_KEY)).toBe(SUBMUNDO_SAVE);
  expect(errors).toEqual([]);
});

test('movimento por teclado, colisão com fachadas e perda de foco', async ({ page }, info) => {
  test.skip(info.project.name.startsWith('mobile'), 'teclado testado no desktop');
  await boot(page);
  await newCareer(page);
  await waitDialogue(page, 'A1-intro');
  await playThrough(page, []);
  const p0 = await player(page);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(1000); await page.keyboard.up('KeyD');
  const p1 = await player(page);
  expect(p1.x).toBeGreaterThan(p0.x + 80);
  // Andar para cima: a colisão das fachadas segura o personagem na calçada.
  await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1600); await page.keyboard.up('ArrowUp');
  const p2 = await player(page);
  expect(p2.y).toBeGreaterThanOrEqual(596);
  expect(p2.y).toBeLessThan(p1.y);
  // Perda de foco com tecla pressionada: personagem para.
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const p3 = await player(page);
  await page.waitForTimeout(600);
  const p4 = await player(page);
  // Sem a limpeza de teclas o personagem andaria ~105 px em 600 ms; tolera 1–2 quadros de latência.
  expect(Math.abs(p4.x - p3.x)).toBeLessThan(40);
  await page.keyboard.up('ArrowLeft');
  // Esc abre e fecha o menu; menu pausa o movimento.
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet')).toBeVisible();
  await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
  expect((await player(page)).x).toBeCloseTo(p4.x, 0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet')).toHaveCount(0);
});

test('joystick de toque move o personagem sem rolar a página', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('mobile'), 'toque testado no celular');
  await boot(page);
  await newCareer(page);
  await waitDialogue(page, 'A1-intro');
  await playThrough(page, []);
  const p0 = await player(page);
  await joystick(page, 1, 0, 900);
  const p1 = await player(page);
  expect(p1.x).toBeGreaterThan(p0.x + 50);
  await joystick(page, 0, 1, 600);
  const p2 = await player(page);
  expect(p2.y).toBeGreaterThan(p1.y + 20);
  const scroll = await page.evaluate(() => ({ y: window.scrollY, x: window.scrollX, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(scroll.y).toBe(0); expect(scroll.x).toBe(0);
  expect(scroll.sw).toBeLessThanOrEqual(scroll.cw);
  // HUD e botão de interação dentro da tela em 360×780
  for (const sel of ['.who', '.objective', '#btnMenu']) {
    const b = await page.locator(sel).boundingBox();
    expect(b, sel).not.toBeNull();
    expect(b!.x).toBeGreaterThanOrEqual(0); expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
});

test('painéis de RPG: abrir/fechar, energia insuficiente, clique duplo e descanso', async ({ page }) => {
  await boot(page);
  await newCareer(page);
  await waitDialogue(page, 'A1-intro');
  await playThrough(page, []);
  await page.locator('#btnMenu').click();
  await expect(page.locator('.sheet')).toBeVisible();
  await page.getByRole('tab', { name: 'Missões' }).click();
  // Clique duplo no treino: apenas um treino aplicado.
  const before = (await st(page)).rpg.stats.labia;
  await page.locator('.box', { hasText: 'Lábia' }).getByRole('button', { name: 'Treinar' }).dblclick();
  await page.waitForTimeout(300);
  expect((await st(page)).rpg.stats.labia).toBe(before + 2);
  // Gasta energia até não poder mais executar a missão mais barata
  for (let i = 0; i < 12; i++) {
    const e = (await st(page)).rpg;
    if (e.energy < 16 || e.jail > 0) break;
    await page.locator('.mission', { hasText: 'Serviço suspeito' }).getByRole('button', { name: 'Executar' }).click();
    await page.waitForTimeout(380);
  }
  const s = (await st(page)).rpg;
  if (s.jail === 0) {
    await expect(page.locator('.mission', { hasText: 'Serviço suspeito' }).getByRole('button', { name: 'Executar' })).toBeDisabled();
  }
  // Descansar avança o dia e recupera energia (regra da v0.4)
  await page.getByRole('tab', { name: 'Temporada' }).click();
  const d0 = (await st(page)).rpg;
  await page.getByRole('button', { name: /Descansar · avançar um dia/ }).click();
  await page.waitForTimeout(300);
  const d1 = (await st(page)).rpg;
  expect(d1.day).toBe(d0.day + 1);
  expect(d1.energy).toBe(Math.min(100, d0.energy + 70));
  await page.getByRole('button', { name: 'Fechar menu (Esc)' }).click();
  await expect(page.locator('.sheet')).toHaveCount(0);
});

test('importação inválida, arquivo do Submundo e exportação', async ({ page }) => {
  await boot(page);
  const file = page.locator('#importFile');
  await file.setInputFiles({ name: 'ruim.json', mimeType: 'application/json', buffer: Buffer.from('{ quebrado') });
  await expect(page.locator('#toast')).toContainText('não é um JSON válido');
  await file.setInputFiles({ name: 'submundo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ game: 'Submundo Brasil', version: '0.4', save: JSON.parse(SUBMUNDO_SAVE) })) });
  await expect(page.locator('#toast')).toContainText('Submundo Brasil');
  await newCareer(page, 'Exporta');
  await waitDialogue(page, 'A1-intro');
  await playThrough(page, []);
  await page.locator('#btnMenu').click();
  await page.getByRole('tab', { name: 'Ajustes' }).click();
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar carreira' }).click();
  const d = await dl;
  expect(d.suggestedFilename()).toMatch(/^marginalidade-rpg-t1-dia1\.json$/);
  const path = await d.path();
  const text = (await import('node:fs')).readFileSync(path!, 'utf8');
  const obj = JSON.parse(text);
  expect(obj.game).toBe('Marginalidade RPG');
  // Reimporta com confirmação
  await file.setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await expect(page.locator('#toast')).toContainText('importada');
  expect(await page.evaluate(k => localStorage.getItem(k), SUBMUNDO_KEY)).toBe(SUBMUNDO_SAVE);
});

test('som: ativação por gesto, mudo persistido; jogo funciona no mudo', async ({ page }) => {
  await boot(page);
  expect((await page.evaluate(() => (window as any).__MRPG__.audio())).state).toBe('none'); // nada toca antes do gesto
  await page.getByRole('button', { name: 'Ativar som' }).click();
  await page.waitForFunction(() => (window as any).__MRPG__.audio().enabled === true);
  const saved = JSON.parse((await page.evaluate(() => localStorage.getItem('marginalidade_rpg_settings_v01')))!);
  expect(saved.soundEnabled).toBe(true);
  await page.getByRole('button', { name: /Som ativado/ }).click();
  expect((await page.evaluate(() => (window as any).__MRPG__.audio())).muted).toBe(true);
  await newCareer(page);
  await waitDialogue(page, 'A1-intro');
  await playThrough(page, []);
  expect(await player(page)).not.toBeNull();
});

test('modo de compatibilidade Canvas e modo painéis sem gráficos', async ({ page }) => {
  await boot(page, '&renderer=canvas');
  expect(await page.evaluate(() => (window as any).__MRPG__.renderer())).toBe('canvas');
  await page.goto('/?e2e=1&renderer=none');
  await expect(page.locator('.notice.error', { hasText: 'Mapa indisponível' })).toBeVisible();
});

test('não trava encostado em um NPC (regressão: personagem parado colado na Lia)', async ({ page }, info) => {
  const touch = info.project.name.startsWith('mobile');
  await boot(page);
  await page.locator('#importFile').setInputFiles(new URL('./fixtures/colado-na-lia.json', import.meta.url).pathname);
  await page.getByRole('button', { name: 'Importar', exact: true }).click();
  await page.waitForFunction(() => (window as any).__MRPG__.player() !== null);
  await page.waitForTimeout(800);
  const dirs: Array<[number, number, string]> = [[1, 0, 'KeyD'], [-1, 0, 'KeyA'], [0, 1, 'KeyS']];
  for (const [dx, dy, key] of dirs) {
    const a = await player(page);
    if (touch) await joystick(page, dx, dy, 700);
    else { await page.keyboard.down(key); await page.waitForTimeout(700); await page.keyboard.up(key); }
    const b = await player(page);
    expect(Math.hypot(b.x - a.x, b.y - a.y), `andar ${key}`).toBeGreaterThan(30);
  }
});

test('Ato I: domingo em casa, conversa com Lia no interior e volta para a rua', async ({ page }, info) => {
  test.setTimeout(480_000);
  const touch = info.project.name.startsWith('mobile');
  await boot(page);
  await importFixture(page, 'a1-m03-voltar-casa');
  await walkToAndTalk(page, 'casa', 'A1-M03-domingo', touch);
  await playThrough(page, []);
  expect((await st(page)).story.clock.label).toBe('Domingo, 17h40');
  await walkToDoor(page, 'casa', 'casa', touch);
  await walkToAndTalk(page, 'lia', 'A1-M03-lia', touch);
  await playThrough(page, [/Contar tudo/]);
  const s = await st(page);
  expect(s.story.flags.lia_informed).toBe(true);
  expect(s.story.missions['A1-M03'].stage).toBe('talk_solange');
  await walkToDoor(page, 'saida_casa', 'vila', touch);
  const p = await player(page);
  expect(Math.abs(p.x - 400)).toBeLessThan(80); // sai pela porta de casa
});

test('Ato I: crise no bar, investigadora e o fim do ato com Miro', async ({ page }, info) => {
  test.setTimeout(480_000);
  const touch = info.project.name.startsWith('mobile');
  await boot(page);
  await importFixture(page, 'a1-m05-crise');
  await walkToDoor(page, 'bar_porta', 'bar', touch);
  await waitDialogue(page, 'A1-M05-crise', 20_000);
  // Sabe do carro prata (Solange contou em A1-M03): a opção aparece.
  await advance(page);
  await expect(page.locator('.choice', { hasText: 'carro prata' })).toBeVisible();
  await playThrough(page, [/Falar a verdade/]);
  expect((await st(page)).story.flags.helena_stance).toBe('colaborou');
  await walkToDoor(page, 'bar_saida', 'vila', touch);
  await walkToAndTalk(page, 'miro', 'A1-M05-oferta', touch);
  await advance(page);
  await choose(page, /proteger os seus/);
  for (let i = 0; i < 30; i++) {
    if (await page.locator('.card .ctext', { hasText: 'Fim do Ato I' }).count()) break;
    await advance(page, 1).catch(() => {});
  }
  await expect(page.locator('.card .ctext')).toContainText('Fim do Ato I');
  await playThrough(page, []);
  const s = await st(page);
  expect(s.story.flags.act1_done).toBe(true);
  // Depois do ato, o extra com Lia (O Mural do Carro Prata) vira o objetivo.
  await expect(page.locator('body')).toContainText('Lia quer colocar no papel tudo o que vocês sabem da sexta');
});

test('mini games: depoimento com a investigadora e bico no balcão do Nando', async ({ page }, info) => {
  test.setTimeout(480_000);
  const touch = info.project.name.startsWith('mobile');
  // O Depoimento (respostas pelo teclado no desktop, por toque no celular)
  await boot(page);
  await importFixture(page, 'a1-m05-crise');
  await walkToDoor(page, 'bar_porta', 'bar', touch);
  await waitDialogue(page, 'A1-M05-crise', 20_000);
  await advance(page);
  await choose(page, /Falar a verdade/);
  expect(await advance(page)).toBe('minigame');
  await expect(page.locator('.mg-root h2')).toHaveText('O Depoimento');
  // Durante o desafio, Esc não fecha nada nem abre menu, e o mapa não anda.
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => (window as any).__MRPG__.menu())).toBeFalsy();
  if (touch) await page.locator('[data-mg="start"]').tap(); else await page.keyboard.press('Digit1');
  const RIGHT = ['Pouco depois das seis', 'Até umas seis e meia', 'No Bar do Nando', 'O Nando', 'Umas sete da noite', 'Pela escadaria'];
  for (let q = 0; q < 4; q++) {
    await page.waitForSelector('.mg-opts .choice:not([disabled])');
    const texts = await page.locator('.mg-opts .choice').allInnerTexts();
    const k = texts.findIndex(t => RIGHT.some(r => t.includes(r)));
    expect(k, texts.join(' | ')).toBeGreaterThanOrEqual(0);
    if (touch) await page.locator('.mg-opts .choice').nth(k).tap(); else await page.keyboard.press(`Digit${k + 1}`);
    await page.waitForTimeout(1400);
  }
  await expect(page.locator('.mg-big')).toHaveText(/\/8/);
  await page.locator('[data-mg="done"]').click();
  const s1 = await st(page);
  expect(s1.story.flags.depoimento).toBeGreaterThanOrEqual(4); // headless lento: algumas podem contar como hesitação
  expect(['firme', 'hesitante']).toContain(s1.story.flags.depoimento_nivel);
  await playThrough(page, []);
  expect((await st(page)).story.missions['A1-M05'].stage).toBe('meet_miro');

  // Pedidos no Balcão: abre pelo menu do Nando, joga e recebe pelo desempenho
  await boot(page);
  await importFixture(page, 'bar-nando-bico');
  await walkToAndTalk(page, 'nando', 'bark-nando', touch);
  await advance(page);
  const before = await st(page);
  await choose(page, /balcão/);
  await expect(page.locator('.mg-root h2')).toHaveText('Pedidos no Balcão');
  await page.locator('[data-mg="start"]').click();
  for (let r = 0; r < 4; r++) {
    await page.waitForSelector('[data-mg="go"]');
    const items = (await page.locator('.mg-tray .mg-slot').allInnerTexts()).map(t => t.split('\n').pop()!.trim());
    await page.locator('[data-mg="go"]').click();
    await page.waitForSelector('.mg-menu');
    for (const label of items) await page.locator('.mg-item', { hasText: label }).first().click();
    await page.waitForTimeout(1300);
  }
  await expect(page.locator('.mg-big')).toHaveText('14/14');
  await page.locator('[data-mg="done"]').click();
  const after = await st(page);
  expect(after.rpg.cash - before.rpg.cash).toBe(190);
  expect(before.rpg.energy - after.rpg.energy).toBe(28);
  expect(after.story.flags.pedidos_recorde).toBe(14);
  await expect(page.locator('#toast')).toContainText('14/14');
});

test('Ato II: nome no mural, encontro com Vânia e A Mesa', async ({ page }, info) => {
  test.setTimeout(600_000);
  const touch = info.project.name.startsWith('mobile');
  await boot(page);
  await importFixture(page, 'a2-m01-inicio');
  await expect(page.locator('body')).toContainText('A2-M01');
  await walkToAndTalk(page, 'solange', 'A2-M01-solange', touch);
  await playThrough(page, []);
  await walkToAndTalk(page, 'mural', 'A2-M01-mural', touch);
  await playThrough(page, [/Guardar os bilhetes/]);
  const s1 = await st(page);
  expect(s1.story.flags.nome_resposta).toBe('assumiu');
  expect(s1.story.missions['A2-M02'].stage).toBe('meet_vania');
  await walkToDoor(page, 'bar_porta', 'bar', touch);
  await walkToAndTalk(page, 'vania', 'A2-M02-vania', touch);
  // Teste de aceitação da Bíblia: o save respondeu "enfrentar" a Miro em A1-M02.
  await expect.poll(async () => (await page.locator('.dlg .text').innerText().catch(() => '')), { timeout: 20_000 }).toBeTruthy();
  const seen: string[] = [];
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.dlg .choice:not([disabled])').count()) break;
    const t = await page.locator('.dlg .text').innerText().catch(() => '');
    seen.push(t);
    await page.locator('[data-advance]').first().click({ position: { x: 20, y: 20 } }).catch(() => {});
    await page.waitForTimeout(150);
  }
  expect(seen.join(' ')).toContain('Miro não esqueceu da resposta atravessada');
  await choose(page, /Por que eu/);
  expect(await advance(page)).toBe('minigame');
  if (touch) await page.locator('[data-mg="start"]').tap(); else await page.keyboard.press('Digit1');
  const RIGHT: Array<[string, number]> = [['relógio', 1], ['repete', 2], ['bate', 2], ['baixo', 3], ['some', 3]];
  for (let k = 0; k < 4; k++) {
    await page.waitForSelector('.mg-opts .choice:not([disabled])');
    const cue = await page.locator('.mg-cue').innerText();
    const n = RIGHT.find(([w]) => cue.includes(w))![1];
    if (touch) await page.locator('.mg-opts .choice').nth(n - 1).tap(); else await page.keyboard.press(`Digit${n}`);
    await page.waitForTimeout(1900);
  }
  await expect(page.locator('.mg-big')).toHaveText(/\/8/);
  await page.locator('[data-mg="done"]').click();
  await playThrough(page, [/Seguir o próprio caminho/]);
  const s2 = await st(page);
  expect(s2.story.flags.mesa).toBeGreaterThanOrEqual(4);
  expect(['firme', 'fragil']).toContain(s2.story.flags.tregua_cais);
  expect(s2.story.flags.vania_alliance).toBe('autonomia');
  expect(s2.story.missions['A2-M02'].status).toBe('completed');
  await expect(page.locator('body')).toContainText('O Ato II continua');
});
