# Arte gerada com Higgsfield

Imagens criadas para este projeto com o Higgsfield (modelo GPT Image 2.6, qualidade média) na conta do
usuário, a pedido dele. Todas retratam pessoas, lugares e situações **fictícios**, sem marcas, logotipos,
texto legível, monumentos reconhecíveis ou figuras reais. Os arquivos estão em `src/assets/art/` e são
empacotados pelo Vite (nada é carregado da internet durante o jogo). Verifique os termos de uso do
Higgsfield antes de distribuir comercialmente.

| Arquivo | Uso no jogo | Origem (job Higgsfield) | Formato no jogo |
|---|---|---|---|
| `retrato_magrao.jpg` | Retrato de diálogo — Breno “Magrão” | 1a858fb1-5a4f-4a29-b3b7-23e121b0f4c6 | 384×384 JPEG |
| `retrato_lia.jpg` | Lia | 9ad940bf-d450-42ea-955a-ea0a597e243c | 384×384 |
| `retrato_solange.jpg` | Dona Solange | d8edce6b-3e94-457e-8639-f3c89848cf48 | 384×384 |
| `retrato_miro.jpg` | Miro Ferrugem | 2ab7ceda-3300-4bc6-87ba-120329918156 | 384×384 |
| `retrato_nando.jpg` | Nando | b0fc7c90-ded5-4c51-9dbd-887183f2e0bd | 384×384 |
| `retrato_ze.jpg` | Seu Zé | 7fa1bdf4-9853-4ff3-966a-484d9d2ef8fe | 384×384 |
| `retrato_player0/1/2.jpg` | Três aparências do protagonista (criação, HUD, diálogo) | b5d3e72b…, e0e63cb2…, 467f122e… | 384×384 |
| `panorama_noite.jpg` | Fundo do morro (parallax 0,15) à noite | 0b4dbb08-58d6-4836-aa83-c00e5c114209 (2688×1152, recortado na faixa céu/morro) | 2150×560 |
| `panorama_entardecer.jpg` | Mesmo panorama ao entardecer (variante feita com o noturno como referência) | 9c355f0f-7d2b-4c2d-9b4a-a3b553b935c9 | 2150×560 |
| `card_vila.jpg` | Fundo do cartão de abertura | panorama noturno, reduzido | 1344×576 |
| `card_encomenda.jpg` | Fundo do cartão sobre Lia e Magrão | 2ceb72a3-620b-446c-b42e-9b9b8fd71bf5 | 1152×645 |
| `card_oficina.jpg` | Fundo do cartão “Magrão não voltou.” | 3e969aaf-6916-4c30-9b0a-649759766a90 | 1152×645 |

**Custo:** 13 gerações, 7,5 créditos (9 retratos × 0,5; panorama 2k × 1; variante 2k × 1; 2 ilustrações × 0,5).

## O que continua procedural (e por quê)
- **Fachadas, chão, objetos sólidos e interior do bar**: precisam coincidir pixel a pixel com portas, colisões e pontos de interação (`src/world/layout.ts`). Uma ilustração gerada não garante essas posições; trocar exigiria arte feita sobre o gabarito do layout.
- **Sprites animados dos personagens** (17 quadros cada): modelos de imagem não produzem ciclos de caminhada consistentes quadro a quadro.
- **Luzes, fumaça, chuva**: efeitos em tempo real.

## Reserva
Se uma imagem não carregar, o jogo volta à arte procedural (retratos pintados por código, morro e prédios
procedurais). Ver `BootScene.preload` e `App.makePortraits`.
