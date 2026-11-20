# Auditoria da base — Submundo Brasil v0.4

Data: 20/11/2026 · Escopo: arquivos efetivamente recebidos no pacote `MARGINALIDADE_RPG_PACOTE_PARA_CLAUDE.zip`.

## 1. Inventário recebido

| Arquivo | Tamanho | SHA-256 (início) | Uso |
|---|---|---|---|
| `Submundo-Brasil-v0.4.html` | 92.916 B, 523 linhas | `322df81c…` | Base técnica (HTML/CSS/JS monolítico) |
| `SUBMUNDO_BRASIL_BIBLIA_NARRATIVA_1.0.html` | 58.608 B | `00d1f004…` | Roteiro, elenco, cinco atos, finais |
| `MARGINALIDADE_RPG_PROMPT_MESTRE_OPUS_5_5.md` | 23.413 B | `44f74e3a…` | Especificação |
| `LEIA_PRIMEIRO.md` | 1.025 B | `cf03c499…` | Instruções do pacote |

Cópias imutáveis (somente leitura, com `SHA256SUMS`) em `reference/submundo-brasil-v0.4/`. O teste
`tests/persistence.test.ts` verifica os checksums a cada execução.

**Não recebidos** (e portanto não usados nem fingidos): imagens, sprites, áudios, mapas, testes, `AGENTS.md`,
`README` do jogo-base, `PROJECT_CONTEXT.md`, `NEXT_STEPS.md`, `VALIDATION.md`, versões posteriores à v0.4.
Nenhuma versão mais recente foi fornecida; a v0.4 foi tratada como origem.

## 2. Arquitetura da v0.4

- Um único arquivo: CSS embutido (duas camadas de estilo, v0.2 e v0.3), HTML estático do cabeçalho/navegação e um IIFE JavaScript (~400 linhas) com estado global `state` em closure.
- Renderização por `innerHTML` de templates; `html()` escapa textos do usuário.
- Navegação: seis vistas (`painel`, `acoes`, `cidade`, `gestao`, `gangue`, `temporada`), barra lateral no desktop e barra inferior no celular.
- Delegação de eventos por `data-action`.
- `confirm()` nativo para encerrar temporada, importar e recomeçar.

## 3. Salvamento

- `localStorage`, chave **`submundo_brasil_v01`**, JSON do objeto `state` inteiro (schema 1), gravado a cada ação (`update()`).
- `validate()` checa tipos/limites; `normalizeSave()` completa campos novos (v0.3) com padrões e limites.
- Exportação: `{ game: 'Submundo Brasil', version: '0.4', exportedAt, save }`; importação com limite de 500 KB, validação e `confirm()`.
- Riscos observados: `log[].msg` não era validado como texto; `eventIndex` não era validado (havia fallback em leitura); sem cópia de segurança antes de importar.

## 4. Sistemas e fórmulas (preservados)

| Sistema | Onde (v0.4) | Observação |
|---|---|---|
| Dinheiro, banco, energia, pressão, respeito, poder | 190, 252–255 | `strength()` = "Poder total" |
| Atributos e treino | 150, 482 | custo `280 + nível×38`, +2 pontos, +1 respeito |
| Chance de missão | 253 | `80 + (poder−dificuldade)×2 − pressão×0,4 − risco distrito − risco evento + carreira`, limitada 12–96 |
| Missões (5) e recompensas | 122–128, 444 | sorteio de recompensa, astúcia +0/1, prisão por chance |
| Especializações | 152–156, 235–254 | Operador +7/pressão ×1,2; Articulador +30% influência/+6 disputa; Empreendedor +20% renda/−6 |
| Distritos e viagem | 129–135, 483 | R$ 90 + 5 energia |
| Acontecimentos da cidade | 142–149 | sorteados ao avançar o dia |
| Notícias com escolha | 162–178, 325–337 | a cada 4 dias |
| Negócios e renda | 136–141, 254, 485 | renda creditada ao avançar o dia |
| Gangue, integrantes, moral, sede | 398–407, 486–498 | manutenção R$ 25/integrante/dia |
| Facções, relações, tensão, tréguas, confrontos, retaliação | 180–186, 363–397, 466–477 | uma ação por facção por dia |
| Influência territorial e disputa | 338–362 | liderar = ≥60 e ≥ rival+10 |
| Metas da temporada | 157–161, 408–422 | bônus R$ 600 |
| Calendário de 30 dias, encerramento e histórico | 445–511 | legado: 5% do patrimônio (máx. R$ 1.200) |

## 5. Pontos de extração

1. Estado global em closure → `src/core/legacy/state.ts` (tipos + padrão + validação + normalização).
2. Fórmulas de leitura → `src/core/legacy/rules.ts` (funções puras).
3. Ações → `src/core/legacy/actions.ts` (alteram um rascunho; o store confirma atomicamente).
4. `rand()` com `crypto` → injetável (`Rng`) para testes determinísticos, mesmo algoritmo em produção.
5. `confirm()` e DOM fora das regras → UI própria (`src/ui`).

## 6. Riscos identificados e tratamento

| Risco | Tratamento |
|---|---|
| Reescrever regras e mudar balanceamento sem perceber | Port 1:1 + **teste diferencial** que executa o JS original da v0.4 (em jsdom isolado) lado a lado com o port, 10 sementes × 400 ações aleatórias, comparando o estado após cada ação |
| Corromper/ler o save do Submundo | Chaves próprias, `assertOwn()` em toda operação de armazenamento, teste que varre `src/` pela chave antiga, teste e2e com save do Submundo presente |
| Import malicioso (HTML, tipos errados) | Validação estrutural completa + normalização + nomes sem `<>` + renderização só por `esc()`/`textContent` |
| Estado divergente entre Phaser e HTML | Store único; Phaser apenas lê e despacha ações |
