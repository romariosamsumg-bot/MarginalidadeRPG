# Recursos provisórios (originais, funcionais) a substituir por arte/áudio de produção

Todos são gerados por código e podem ser trocados por arquivos sem mudar a lógica: basta registrar
texturas com as mesmas chaves em `src/game/scenes/BootScene.ts`.

| Chave / recurso | Gerado em | Sugestão de produção |
|---|---|---|
| `morro`, `predios`, céu | `art/vila.ts` | **Já substituídos** pelo panorama pintado (Higgsfield) — procedural fica como reserva |
| `fachadas` (2900×610) | `art/vila.ts` | Ilustração das fachadas no mesmo layout de portas (ver `world/layout.ts`) |
| `chao`, `fios` | `art/vila.ts` | Chão com calçada/asfalto/poças; fios em camada separada |
| `bar_sala` | `art/bar.ts` | Interior do bar 1280×760 |
| Objetos (`poste`, `moto`, `carro`, `viatura`, `mesa`, `arvore`, `abrigo`…) | `art/props.ts` | Sprites com origem no centro da base |
| Folhas `char_*` (17 quadros cada) | `art/characters.ts` | **Já substituídas** para os 9 personagens nomeados (Higgsfield); `char_ped*` procedurais ficam só como reserva |
| Retratos de diálogo | `paintPortrait` | **Já substituídos** por retratos pintados (Higgsfield) — ver `docs/ARTE_GERADA.md` |
| Luzes (`glow*`, `cone`, `pool`), fumaça, chuva | `art/props.ts` | Podem continuar procedurais |
| Ambiente, passos, efeitos, tema e rádio do bar | `audio/audio.ts` | Gravações/composições originais (OGG/M4A) |
