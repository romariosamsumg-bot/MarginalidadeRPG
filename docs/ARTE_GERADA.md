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

**Custo (1ª rodada):** 13 gerações, 7,5 créditos (9 retratos × 0,5; panorama 2k × 1; variante 2k × 1; 2 ilustrações × 0,5).

## Personagens animados (2ª rodada)

Folhas de sprites pintadas, geradas com o **retrato de cada personagem como referência de identidade**
(GPT Image 2.6, 1k, 16:9, fundo transparente). Cada folha traz 8 quadros de caminhada de perfil e 4 poses
(parado, parado 2, interagir, celular). `scripts/sprites/process_sheet.py` detecta os quadros pela
transparência, normaliza a altura, alinha os pés na mesma linha, centraliza pelo tronco (o corpo não
"balança" ao andar), gera a respiração do parado a partir de uma única pose e exporta no formato do
jogo (17 quadros de 160×264 px). Depois convertemos para WebP (q88) — 1,6 MB para os 9 personagens.

| Arquivo | Personagem | Job Higgsfield | Qualidade |
|---|---|---|---|
| `char_player0.webp` | Protagonista — aparência 1 | a9381437-6a1f-406e-a66f-b59dd32438fb | média (0,5) |
| `char_player1.webp` | Protagonista — aparência 2 | bb4c7dc0-09b1-4b7d-8cd9-a9f9262214d1 | baixa (0,25) |
| `char_player2.webp` | Protagonista — aparência 3 | e50098a7-0d24-41e0-8489-cbc221affcce | baixa |
| `char_magrao.webp` | Magrão | ec5e5169-761f-46b4-9d41-f003be48644d | baixa |
| `char_lia.webp` | Lia | a8cb610d-844f-4686-80dc-1700521e9479 | baixa |
| `char_solange.webp` | Dona Solange | bceb7a98-0ca8-40b2-8e54-fa8c70563fa0 | baixa |
| `char_miro.webp` | Miro | d06a9d57-79eb-44dc-a00e-b2f630255bd5 | baixa |
| `char_nando.webp` | Nando | 32bae1ad-921e-4e2f-821d-b53565beecea | baixa |
| `char_ze.webp` | Seu Zé | ff4e0df6-4a08-4d3c-9f4a-c14466fca3b3 | baixa |

A qualidade baixa foi testada primeiro (Magrão) e ficou praticamente igual à média neste tamanho, o que
permitiu cobrir os 9 personagens com o saldo disponível. **Custo:** 2,5 créditos. Os moradores anônimos
reaproveitam as duas aparências do protagonista que o jogador não escolheu, com variação de tom.

Para refazer/adicionar: gere a folha com o mesmo padrão de prompt (ver os jobs acima no Higgsfield),
rode `python3 -I scripts/sprites/process_sheet.py folha.png src/assets/sprites/char_<id>.png` e converta
para `.webp`. A chave `char_<id>` é detectada automaticamente (`src/art/assets.ts`).

**Total gasto no projeto:** 10 créditos (saldo zerado).

## O que continua procedural (e por quê)
- **Fachadas, chão, objetos sólidos e interior do bar**: precisam coincidir pixel a pixel com portas, colisões e pontos de interação (`src/world/layout.ts`). Uma ilustração gerada não garante essas posições; trocar exigiria arte feita sobre o gabarito do layout.
- **Luzes, fumaça, chuva**: efeitos em tempo real.

## Reserva
Se uma imagem não carregar, o jogo volta à arte procedural (retratos pintados por código, morro e prédios
procedurais). Ver `BootScene.preload` e `App.makePortraits`.
