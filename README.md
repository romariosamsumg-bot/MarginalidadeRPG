# Marginalidade RPG — O Preço do Poder (v0.1)

RPG urbano brasileiro **fictício** para navegador. Você explora a **Vila do Dique** (Rio de Janeiro) em 2.5D,
conversa com moradores, toma decisões que o jogo lembra e evolui uma carreira com os sistemas herdados do
Submundo Brasil v0.4 (missões, treino, banco, negócios, gangue, facções, temporadas).

> Jogo novo e independente. **Não** modifica, publica por cima nem lê o save do Submundo Brasil
> (`submundo_brasil_v01`). O progresso deste jogo fica em `marginalidade_rpg_v01`, só neste navegador.

## Jogar

- **Desktop:** WASD/setas para andar · **E** ou **Espaço** para interagir/avançar falas · **1–3** escolhem · **Esc** fecha / abre o menu · **M** menu.
- **Celular:** arraste no canto inferior esquerdo (joystick) · toque no botão redondo **Interagir** · ou toque direto numa pessoa/lugar para ir até lá.
- O som começa desligado (regra dos navegadores): toque em **Ativar som** no título ou no ícone de som.

### Só tenho um celular — como abrir?
1. Baixe **`marginalidade-rpg-v0.1.html`** (arquivo único, ~1,6 MB, com tudo embutido — não precisa de internet nem de servidor).
2. No Android, abra o app **Arquivos**, toque no arquivo e escolha **Chrome**. (Verificado abrindo por `file://` no Chromium: carrega e inicia uma carreira sem erros.)
3. Se o seu gerenciador de arquivos não oferecer o Chrome, publique a pasta do `marginalidade-rpg-v0.1-build.zip` num hospedeiro estático gratuito (Netlify Drop, GitHub Pages, Cloudflare Pages) e abra o link.

O progresso fica salvo no próprio navegador. Use **Menu › Temporada › Exportar carreira** para guardar uma cópia.

## Desenvolver

Requisitos: Node 20+ (testado em 22.23) e npm.

```bash
npm ci               # instala versões travadas
npm run dev          # servidor de desenvolvimento (Vite)
npm run typecheck    # TypeScript estrito
npm test             # testes unitários (Vitest), inclui teste diferencial contra a v0.4 original
npm run build        # build de produção em dist/
npm run preview      # serve dist/ em http://localhost:4173
npm run test:e2e     # Playwright (sobe o preview sozinho)
npm run package      # gera release/*.zip (projeto e build)
```

Parâmetros de URL úteis: `?renderer=canvas` (força Canvas), `?renderer=none` (modo painéis sem mapa), `?e2e=1` (expõe `window.__MRPG__` somente leitura para testes).

## Estrutura

```
src/
  core/legacy/   regras da v0.4 portadas 1:1 (dados, fórmulas, ações, validação)
  core/          estado autoritativo (schema, migração) e store com despacho atômico
  narrative/     motor de diálogo (condições, efeitos permitidos, idempotência), conteúdo do Ato I, gatilhos, validador
  world/         layout das áreas (colisões, pontos de interesse, NPCs, postes)
  art/           pintura procedural (cenários, objetos, personagens, retratos)
  game/          Phaser: carregamento, cena de exploração, entrada, ponte jogo↔UI
  audio/         síntese Web Audio (ambiente, passos, efeitos, música)
  ui/            HTML/CSS: título, criação, HUD, toque, diálogo, painéis, modais
  persistence/   salvamento local, importação/exportação, configurações
tests/           Vitest (diferencial v0.4, narrativa, persistência)
e2e/             Playwright (fluxo completo, toque, teclado, painéis, importação, som)
reference/       cópia imutável da v0.4 e da Bíblia, com SHA256SUMS
docs/            auditoria, migração, decisões, validação, recursos a substituir, próximos passos
```

### Dependências (e por quê)
| Pacote | Versão | Motivo |
|---|---|---|
| phaser | 4.2.1 | cena 2D, câmera, física Arcade, animações, WebGL com fallback Canvas |
| typescript | 6.0.2 | modo estrito (dev) |
| vite | 8.3.8 | dev server e build (dev) |
| vitest | 5.1.1 | testes de lógica (dev) |
| @playwright/test | 1.63.0 | e2e e responsividade; casa com o Chromium do ambiente (dev) |
| jsdom | 31.0.1 | executar o JS original da v0.4 no teste diferencial (dev) |
| @types/node, @types/jsdom | — | tipos (dev) |

Nenhuma dependência por CDN; nenhuma requisição de rede depois do carregamento.

## Documentação
- [Auditoria da v0.4](docs/AUDITORIA_V04.md) · [Mapa de migração](docs/MIGRACAO_V04.md) · [Decisões](docs/DECISOES.md)
- [Validação (comandos e resultados reais)](docs/VALIDACAO.md) · [Recursos a substituir](docs/RECURSOS_A_SUBSTITUIR.md) · [Próximos passos](docs/PROXIMOS_PASSOS.md)

Universo, bairros, grupos e personagens são inventados. O jogo não descreve procedimentos de crimes reais.
