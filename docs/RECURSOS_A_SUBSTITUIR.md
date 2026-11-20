# Recursos provisórios (originais, funcionais) a substituir por arte/áudio de produção

Todos são gerados por código e podem ser trocados por arquivos sem mudar a lógica: basta registrar
texturas com as mesmas chaves em `src/game/scenes/BootScene.ts`.

| Chave / recurso | Gerado em | Sugestão de produção |
|---|---|---|
| `ceu_entardecer`, `ceu_noite`, `lua` | `art/vila.ts` | Pintura digital de céu (1024×512) |
| `morro` (casas e antena), `predios` | `art/vila.ts` | Camadas de fundo pintadas (parallax 0,15 e 0,42) |
| `fachadas` (2900×610) | `art/vila.ts` | Ilustração das fachadas no mesmo layout de portas (ver `world/layout.ts`) |
| `chao`, `fios` | `art/vila.ts` | Chão com calçada/asfalto/poças; fios em camada separada |
| `bar_sala` | `art/bar.ts` | Interior do bar 1280×760 |
| Objetos (`poste`, `moto`, `carro`, `viatura`, `mesa`, `arvore`, `abrigo`…) | `art/props.ts` | Sprites com origem no centro da base |
| Folhas `char_*` (17 quadros cada) | `art/characters.ts` | Spritesheets 3/4 lateral; manter ordem de quadros |
| Retratos de diálogo | `paintPortrait` | Retratos 512×512 (Bíblia, seção 9) |
| Luzes (`glow*`, `cone`, `pool`), fumaça, chuva | `art/props.ts` | Podem continuar procedurais |
| Ambiente, passos, efeitos, tema e rádio do bar | `audio/audio.ts` | Gravações/composições originais (OGG/M4A) |
