# Validação — Marginalidade RPG v0.1

Ambiente: contêiner Linux, Node 22.23.5, Chromium 1243 (Playwright 1.63) **headless com GL por software (SwiftShader)**.
Data: 20/11/2026. Todos os resultados abaixo são de execuções reais nesta sessão.

## Comandos e resultados

| Comando | Resultado |
|---|---|
| `npm run typecheck` (`tsc --noEmit`, modo estrito) | 0 erros |
| `npm test` (Vitest) | **4 arquivos, 46 testes, 46 aprovados** |
| `npm run build` | ok — `index` ≈ 74 KB gzip, `phaser` ≈ 357 KB gzip, CSS ≈ 5 KB gzip |
| `npm run test:e2e` (Playwright, perfis `mobile-360` e `desktop`) | **12 aprovados, 2 pulados por design, 0 falhas** (9,8 min) |

Pulados por design: o teste de teclado roda só no desktop; o teste de joystick roda só no perfil de celular.

### Testes unitários (o que cobrem)
- **Diferencial v0.4** (`tests/legacy.differential.test.ts`): executa o JavaScript original da v0.4 em jsdom isolado e o port TypeScript lado a lado, 10 sementes × 400 ações aleatórias (missões, dias, treino, viagem, banco, compra, notícias, carreira, meta, gangue, facções, encerramento de temporada), comparando o estado inteiro após cada ação e as fórmulas de chance/poder/renda/odds no fim. Verificação de sensibilidade: alterar a constante 80→81 na fórmula de chance faz o teste falhar.
- **Narrativa** (`tests/narrative.test.ts`): validador de conteúdo (sem IDs repetidos, destinos inexistentes, nós sem saída, recompensa em cena repetível, > 3 opções); 4 rotas completas de A1-M01/A1-M02; recusa reconhecida em A1-M02; reação tardia de Nando e Lia após recarregar; recompensa única (+3 respeito) não duplica com recarga/redespacho; clique duplo em escolha rejeitado; requisito Lábia 6.
- **Persistência** (`tests/persistence.test.ts`): chave do Submundo nunca tocada (e nenhuma referência a ela em `src/`); save corrompido preservado; versão futura recusada; normalização; import inválido/adulterado/grande/do Submundo recusado; nome com marcação neutralizado; store atômico; energia insuficiente; ciclo de energia/pressão; temporada nova preserva campanha; checksums da referência v0.4.
- **Caminho** (`tests/path.test.ts`): A\* da casa ao bar e da porta ao balcão sem atravessar obstáculos.

### Testes e2e (Playwright, build de produção)
| Cenário exigido | Teste | 360×780 | 1366×768 |
|---|---|---|---|
| Nova carreira → exploração → conversa → escolha → missão → salvar → recarregar (no meio do diálogo) → reação persistente; mudança de área; save do Submundo intacto | fluxo completo | ✓ (toque) | ✓ (mouse) |
| Teclado, colisão com fachadas, perda de foco, Esc/menu pausa movimento | movimento por teclado | — | ✓ |
| Joystick por toque, sem rolagem da página, HUD dentro da tela | joystick | ✓ | — |
| Abrir/fechar painel, clique duplo, energia insuficiente, descansar | painéis | ✓ | ✓ |
| Importação inválida, arquivo do Submundo, exportação e reimportação | importação | ✓ | ✓ |
| Som só após gesto, mudo persistido, jogo funciona no mudo | som | ✓ | ✓ |
| Fallback Canvas forçado e modo painéis sem gráficos | compatibilidade | ✓ | ✓ |

### Capturas de tela
`docs/screenshots/` — 10 telas em cada resolução: 360×780, 390×844, 768×1024 e 1366×768 (título, criação, cartão, Vila, diálogo, menu, missões, história, bar, Vila à noite com festival/viatura/negócio). Nenhum erro de página registrado durante as capturas.

## Desempenho — honestidade sobre os números
FPS medido pelo próprio Phaser (`game.loop.actualFps`) durante as capturas, **em Chromium headless com renderização WebGL por software, sem GPU**:

| Resolução | FPS medido |
|---|---|
| 360×780 (DPR 2) | 10,8 |
| 390×844 (DPR 2) | 8,9 |
| 768×1024 (DPR 2) | 4,3 |
| 1366×768 (DPR 1) | 6,4 |

Esses números **não representam celulares reais** (que renderizam na GPU) e não são meta atingida nem garantia. O que eles provam: o jogo continua correto em FPS muito baixo — a velocidade de caminhada é constante (289 px em ~2 s a ~10 FPS) graças ao delta real e aos passos fixos da física. **Não verificado:** FPS em Chrome Android real, em GPU de desktop, aquecimento térmico e consumo de bateria. Use **Ajustes › Mostrar FPS** para medir no aparelho.

## O que permanece não verificado
- Execução em Chrome Android físico e em Safari/iOS (apenas emulação de viewport/toque no Chromium).
- Áudio audível: o teste confirma que o `AudioContext` só é criado após o gesto e que o mudo persiste, mas ninguém ouviu o som neste ambiente.
- Retorno do app em segundo plano no Android (testado só o evento `blur`/`visibilitychange` lógico).
- Leitores de tela (há rótulos ARIA e foco visível, sem teste com TalkBack/VoiceOver).
