# Próximos passos priorizados — v0.2

Sem expandir a v0.1: estes itens partem do que já está jogável e testado.

1. **Teste em aparelho Android real** (Chrome, aparelho intermediário e um fraco): medir FPS com "Mostrar FPS", ajustar teto de resolução e quantidade de brilhos aditivos por qualidade. Os números medidos aqui vieram de Chromium headless com GL por software (não representativos).
2. ~~A1-M03, A1-M04 e A1-M05~~ — **feitos** (Ato I completo, ver `DECISOES.md › Ato I completo`).
3. ~~A2-M01 e A2-M02~~ — **feitos**. Próximo: **A2-M03 "A Pessoa Errada"** (uma ordem de Miro atinge alguém que ajudou o protagonista — candidatos naturais: Jorge da banca, se o bilhete foi levado ao Miro, ou Dona Solange); usar `tregua_cais`, `vania_alliance`, `nome_resposta`, `miro_lie_hint` e `helena_trust`. Decisão da Bíblia: defender a pessoa apontada por Miro (retorno no Ato V).
3a. **Mais mini games** (ideias já levantadas): quebra-cabeça mecânico na oficina do Magrão (abrir a caixa no Ato II), troco/caixa da mercearia da Solange, ler o blefe de Miro numa negociação (tempo de reação, com a Lábia ajudando), rota pelos becos até o Cais do Norte.
3b. **Retratos de Helena Paiva e Vânia Cinza** e um quarto/cozinha com mais objetos na casa (hoje Helena fala sem retrato; o interior da casa é procedural). Exige créditos de geração ou arte própria.
4. **Arte de produção** substituindo as texturas procedurais (lista em `RECURSOS_A_SUBSTITUIR.md`), mantendo chaves e layout de colisão.
5. **Ciclo dia/noite ligado ao descanso** (hoje o mundo fica noturno após o prólogo).
6. **Revisão de balanceamento** com simulações automáticas (o harness diferencial já permite rodar milhares de temporadas) — nenhuma mudança antes de relatório.
7. **PWA real** (service worker + manifesto) com teste de modo avião; só então anunciar instalação offline.
8. **IndexedDB** se o histórico/estado crescer além de ~1 MB; manter exportação JSON.
9. **Acessibilidade**: navegação por lista de lugares também com o mapa ativo (já existe no modo painéis), leitura de retratos com descrição, ajuste de velocidade do texto.
10. Preparação para servidor (ações já são explícitas e serializáveis) — sem multiplayer enquanto a campanha não estiver estável.
