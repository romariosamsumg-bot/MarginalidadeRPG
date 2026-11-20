# Mapa de migração — Submundo Brasil v0.4 → Marginalidade RPG v0.1

Legenda: **Preservado** = mesma regra e mesmos números (verificado pelo teste diferencial) ·
**Adaptado** = mesma regra, apresentação/acesso diferente · **v0.2** = adiado.

| Sistema da v0.4 | Situação | Onde está agora | Notas |
|---|---|---|---|
| Estado inicial (R$ 1.900, energia 100, atributos 6/4/4/3, respeito 5) | Preservado | `core/legacy/state.ts` | Só o texto do primeiro registro mudou (Vila do Dique) |
| `validate` / `normalizeSave` | Preservado + reforçado | `core/legacy/state.ts`, `core/state.ts` | Extra: tipos do registro, `eventIndex`, nomes sem marcação |
| Chance de missão, poder, renda, poder total | Preservado | `core/legacy/rules.ts` | Teste diferencial + mutação detectada |
| 5 missões, recompensa, falha, detenção | Preservado | `actions.ts#mission` | Texto "detido" neutralizado para "sob detenção" |
| Treino de atributos | Preservado | `actions.ts#train` | Painel Missões › Centro de treinamento |
| Especializações | Preservado + adaptado | criação de personagem e painel Início | Pode escolher na criação ou depois (como na v0.4); recomeça a cada temporada |
| Bico e "ficar na sua" | Preservado | painel Missões | |
| Distritos e viagem | Preservado + adaptado | painel Cidade, aberto pelo **ponto de ônibus** | O distrito é "de atuação"; o protagonista mora na Vila do Dique |
| Acontecimentos da cidade | Preservado + reflexo no mapa | `nextDay` | "Festival de rua" mostra bandeirinhas; dias movimentados trazem mais pedestres |
| Notícias com escolha | Preservado | painel Início | |
| Banco e negócios | Preservado + reflexo no mapa | painel Economia, aberto pela **mercearia** (correspondente bancário) e pelo **ponto comercial** | O último negócio comprado acende uma placa no ponto comercial vazio |
| Gangue, integrantes, moral, sede | Preservado | painel Gangue, aberto pelo **Nando** no bar | |
| Facções, tréguas, confrontos, retaliação | Preservado | painel Gangue | Textos reforçam que confronto é disputa abstrata |
| Influência territorial e disputa | Preservado | painel Cidade | |
| Metas e calendário de 30 dias | Preservado | painel Temporada, aberto pela **casa** | "Avançar dia" = "Descansar"; pressão ≥ 60 ou fiscalização mostram viatura no mapa |
| Encerrar temporada / histórico | Preservado + adaptado | painel Temporada | `confirm()` virou modal; a **campanha não reinicia** com a temporada |
| Exportar / importar / recomeçar | Adaptado | Temporada e Ajustes | Formato `game: "Marginalidade RPG"`; arquivo do Submundo é recusado com explicação; cópia de segurança interna antes de importar/recomeçar |
| Seis cidades de origem | Preservado + adaptado | criação; painel Cidade › Brasil | Cidade natal ≠ localização atual; demais cidades marcadas como conteúdo do Ato III |
| Navegação Início/Missões/Cidade/Economia/Gangue/Temporada | Adaptado | menu do jogo (abas) + pontos do mapa | Mais as abas História e Ajustes |
| `localStorage` `submundo_brasil_v01` | **Não usado** | — | Chave nova `marginalidade_rpg_v01` |
| Rebalanceamento econômico | v0.2 | — | Nenhum valor foi alterado na v0.1 |
| Multiplayer / backend | Fora de escopo | — | Arquitetura de ações explícitas facilita servidor futuro, sem fingir que existe |
