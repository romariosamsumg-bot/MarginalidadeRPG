# Próximos passos priorizados — v0.2

Sem expandir a v0.1: estes itens partem do que já está jogável e testado.

1. **Teste em aparelho Android real** (Chrome, aparelho intermediário e um fraco): medir FPS com "Mostrar FPS", ajustar teto de resolução e quantidade de brilhos aditivos por qualidade. Os números medidos aqui vieram de Chromium headless com GL por software (não representativos).
2. **A1-M03 "Portas Fechadas"** (Casa de Lia e Mercearia de Solange): interior da casa como segundo interior; flags `lia_informed`/`lia_kept_out`, `solange_met`; reconhecer `refused_package` (teste de aceitação da Bíblia).
3. **A1-M04 e A1-M05**: primeiro serviço como evento abstrato do RPG (usando chance/energia do núcleo), crise local, escolha de atitude, desbloqueio do Ato II sem bloquear o jogo livre.
4. **Arte de produção** substituindo as texturas procedurais (lista em `RECURSOS_A_SUBSTITUIR.md`), mantendo chaves e layout de colisão.
5. **Ciclo dia/noite ligado ao descanso** (hoje o mundo fica noturno após o prólogo).
6. **Revisão de balanceamento** com simulações automáticas (o harness diferencial já permite rodar milhares de temporadas) — nenhuma mudança antes de relatório.
7. **PWA real** (service worker + manifesto) com teste de modo avião; só então anunciar instalação offline.
8. **IndexedDB** se o histórico/estado crescer além de ~1 MB; manter exportação JSON.
9. **Acessibilidade**: navegação por lista de lugares também com o mapa ativo (já existe no modo painéis), leitura de retratos com descrição, ajuste de velocidade do texto.
10. Preparação para servidor (ações já são explícitas e serializáveis) — sem multiplayer enquanto a campanha não estiver estável.
