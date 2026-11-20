/**
 * Empacota a entrega em release/:
 *  - marginalidade-rpg-v0.1-projeto.zip  (código, testes, docs, referência, lockfile — sem node_modules)
 *  - marginalidade-rpg-v0.1-build.zip    (dist/ pronto para hospedar + versão de arquivo único)
 *  - marginalidade-rpg-v0.1.html         (arquivo único: JS e CSS embutidos; abre sem servidor)
 * Requer o utilitário `zip` no sistema.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const rel = join(root, 'release');
rmSync(rel, { recursive: true, force: true });
mkdirSync(rel);

// 1) Build normal (multi-arquivo) em dist/
run('npx', ['vite', 'build']);

// 2) Build de arquivo único em dist-single/ e embute JS/CSS no HTML
run('npx', ['vite', 'build', '--outDir', 'dist-single', '--config', 'vite.single.config.ts']);
const single = join(root, 'dist-single');
let html = readFileSync(join(single, 'index.html'), 'utf8');
const assets = join(single, 'assets');
for (const f of readdirSync(assets)) {
  const content = readFileSync(join(assets, f), 'utf8');
  if (f.endsWith('.js')) {
    const re = new RegExp(`<script type="module" crossorigin src="\\./assets/${f.replace(/\./g, '\\.')}"></script>`);
    if (!re.test(html)) throw new Error(`script ${f} não encontrado no HTML`);
    html = html.replace(re, () => `<script type="module">${content.replace(/<\/script/gi, '<\\/script')}</script>`);
  } else if (f.endsWith('.css')) {
    const re = new RegExp(`<link rel="stylesheet" crossorigin href="\\./assets/${f.replace(/\./g, '\\.')}">`);
    if (!re.test(html)) throw new Error(`css ${f} não encontrado no HTML`);
    html = html.replace(re, () => `<style>${content}</style>`);
  }
}
if (/src="\.\/assets\//.test(html)) throw new Error('restaram referências externas no HTML de arquivo único');
const singleName = 'marginalidade-rpg-v0.1.html';
writeFileSync(join(rel, singleName), html);
copyFileSync(join(rel, singleName), join(root, 'dist', singleName));
rmSync(single, { recursive: true, force: true });

// 3) ZIP do build
run('zip', ['-r', '-q', join(rel, 'marginalidade-rpg-v0.1-build.zip'), '.'], { cwd: join(root, 'dist') });

// 4) ZIP do projeto (arquivos versionados + não ignorados)
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
  .split('\n').filter(f => f && existsSync(join(root, f)));
writeFileSync(join(rel, '.files'), files.join('\n'));
execFileSync('zip', ['-q', join(rel, 'marginalidade-rpg-v0.1-projeto.zip'), '-@'], { cwd: root, input: files.join('\n') });
rmSync(join(rel, '.files'));
console.log(`\nPacotes em ${rel}:`);
for (const f of readdirSync(rel)) console.log(' -', f);
