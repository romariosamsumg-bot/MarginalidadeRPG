# Decisões de projeto (v0.1)

Decisões não críticas tomadas sem bloquear o início, conforme o prompt mestre.

## Tecnologia
- **Phaser 4.2.1** (WebGL, fallback Canvas automático), **TypeScript 6.0 estrito**, **Vite 8**, **Vitest 5**, **Playwright 1.63** — versões exatas travadas no `package-lock.json`. TypeScript 7 existia no npm, mas preferi a 6.0 (já validada no ambiente) para o `tsc --noEmit`. Playwright 1.63 casa com o Chromium pré-instalado.
- APIs do Phaser 4 conferidas na própria instalação (`node_modules/phaser/skills/v3-to-v4-migration`, `types/phaser.d.ts`). Usamos apenas o núcleo estável: sprites, texturas de canvas, Arcade, tweens, partículas, câmera, blend `ADD`/`MULTIPLY` (suportados nativamente em WebGL 4).
- **`fps.smoothStep: false`**: com a suavização padrão, o `TimeStep` do Phaser limita o delta a 16,6 ms durante 120 quadros após iniciar e sempre que a janela perde o foco. Em FPS baixo isso deixava o jogo em câmera lenta (medido: 41 px em 2,4 s a ~10 FPS). Com delta real, o Arcade recupera passos fixos e a velocidade fica constante (medido: 289 px em ~2 s a ~10 FPS).
- **Teclado tratado no DOM** (não no Phaser) para não conflitar com campos de texto e para limpar teclas na perda de foco.
- **Áudio do Phaser desligado** (`noAudio`): todo o som é Web Audio próprio, criado apenas após gesto do usuário.
- **Resolução interna** = tamanho CSS × fator (baixa ≤ 0,8×, padrão ≤ 1,5×, alta ≤ 2× DPR) com teto de pixels; o texto é HTML e permanece nítido.
- **Parallax manual** (posição calculada da janela de visão) em vez de `scrollFactor`, porque é estável com zoom variável em retrato/paisagem.

## Arte e som
- **Atualização:** retratos, panorama do morro (entardecer e noite) e ilustrações dos cartões foram gerados com Higgsfield a pedido do usuário (`docs/ARTE_GERADA.md`). O restante abaixo continua valendo para cenário caminhável e sprites.
- Nenhum asset foi fornecido. Toda a arte é **pintada proceduralmente em Canvas 2D** no carregamento (estilo graphic novel: contorno grosso, sombra dura, retícula, azul-petróleo/âmbar/vermelho). Tudo é original e local: nenhum hotlink, nenhuma marca real. Placas usam nomes fictícios ("Oficina 24", "Bar do Nando", "Mercearia da Solange", "Linha 314").
- Personagens: 17 quadros por folha (ociosidade 4, caminhada 8, interação 3, celular 2), espelhados horizontalmente.
- Som sintetizado (ruído filtrado, osciladores). Não há narração gravada nem música licenciada.

## Mundo e narrativa
- **Lia é prima do protagonista**, "quase irmã" (a Bíblia pede vínculo familiar sem impor origem). Cidade natal ≠ Rio: a introdução explica que a família de Lia acolheu o protagonista há seis anos.
- **Gênero do protagonista não é imposto**: falas e textos do sistema foram escritos em forma neutra ("sob detenção", "no escuro do quarto").
- **Miro só aparece no bar** durante A1-M02 (cutscene: ele se levanta e puxa a cadeira). Depois passa a ficar na esquina, à noite, com falas que lembram sua resposta.
- Três NPCs nomeados visíveis no hub desde o início: **Magrão, Lia, Dona Solange**; no bar: **Nando e Seu Zé**; **Miro** no bar e depois na esquina. Pedestres anônimos com rotinas simples.
- **Memória narrativa demonstrada**: recusar a caixa em A1-M01 muda falas de Miro em A1-M02; a resposta a Lia e a resposta a Miro mudam as falas de Lia, Nando, Dona Solange e do próprio Miro depois.
- Missão única concede **+3 de respeito uma vez** (via `grantRespect`, mecanismo oficial do núcleo). Nenhuma recompensa em dinheiro por diálogo; nenhuma dívida monetária é debitada (Bíblia).
- Opção com requisito (**Lábia 6**) aparece desabilitada com explicação; sempre há alternativa sem requisito (validador garante).
- Relógio da história ("Sexta-feira, 18h10" → "Sábado, 23h40") é separado da temporada de 30 dias. Encerrar a temporada **não** reinicia a campanha.
- Missões A2-M03 a A5-M05 aparecem na aba História como **"Em produção"**.

## Ato I completo (A1-M03 a A1-M05)
- **A1-M03 "Portas Fechadas"**: domingo à tarde, a casa vira um interior explorável (cozinha, sofá, porta). Lia pergunta o que está acontecendo — contar tudo (`lia_informed=true`), só uma parte (`'parcial'`) ou esconder (`lia_kept_out`, ela vai passar uns dias na tia e some do mapa até o fim do ato). Dona Solange conta do **carro prata** (`knows_silver_car`) e, com Lábia 6, promete avisar (`solange_ally`). A fala de Lia reconhece a resposta dada na noite da caixa e se o protagonista recusou a encomenda.
- **A1-M04 "O Primeiro Serviço"**: o serviço é um **evento abstrato** (buscar uma mochila fechada num galpão fictício do "Cais do Norte"), sem nenhum procedimento real. Fazer/negociar gastam 25 de energia e rolam um teste com a fórmula `base 50 + Astúcia×3,5 − Pressão×0,4 (+8 se negociou)`, limitada a 15–90%; o resultado fica em `m04_result` e a chance em `m04_result_chance`. Recusar também é caminho válido (mais pressão, Miro em conflito, pichação "DEVE" na casa). Pagamento de R$ 300 (escala da economia legada) só em cena única, uma vez — teste garante que recarregar não duplica.
- **"Agora não"** (`defer`) encerra a conversa sem concluir a cena; a missão pode ser retomada.
- **A1-M05 "Sangue e Dívida"**: Nando é agredido **fora de cena** e vai para o hospital (sem descrição de violência). Viatura em frente ao bar; a investigadora fictícia **Helena Paiva** pergunta — colaborar reduz pressão, silêncio aumenta, e **só quem ouviu Solange** pode perguntar do carro prata (memória entre missões, testada). Miro oferece proteção e o protagonista entra com uma de três atitudes (`m05_attitude`: ressentimento / proteger / ambição). Cartão "Fim do Ato I — A Queda", +5 de respeito uma vez, `act1_done`.
- Depois do ato, Lia, Nando, Dona Solange, Seu Zé e Miro têm falas novas conforme as escolhas. A carreira continua livre; o Ato II aparece como "Em produção".
- Relógio da história: Domingo 17h40 (entardecer) → Segunda 20h50 → Terça 22h10 (noite).
- "União da Linha", "Cais do Norte", Helena Paiva e Vânia Cinza são nomes fictícios da Bíblia; nenhum grupo, lugar ou pessoa real.

## Segurança e robustez
- Chaves exclusivas (`marginalidade_rpg_v01`, `_backup`, `_corrompido`, `_settings_v01`); `assertOwn()` impede tocar qualquer outra chave.
- Save corrompido é preservado em chave de recuperação e pode ser baixado pela tela de título.
- Durante uma cena única, ações de carreira ficam bloqueadas (evita estados cruzados).
- Clique duplo: escolhas exigem o ID do nó atual; botões de painel ignoram repetição em 350 ms.
- Sem PWA na v0.1: não anunciamos instalação nem cache offline garantido. Depois de carregado, o jogo não faz nenhuma requisição de rede.

## Tocar para ir
- O "tocar numa pessoa/lugar" usa **A\* em grade de 16 px** sobre a área caminhável, com colisores inflados pela pegada do personagem e suavização por linha de visada (`src/world/path.ts`, testado em `tests/path.test.ts`). As primeiras versões (linha reta, depois desvios heurísticos) travavam em mesas e na moto — achado dos testes e2e.
- Toque curto (< 260 ms, < 12 px) na zona do joystick vale como toque no mapa; arrastar continua sendo joystick. Sem isso, pessoas e lugares no canto inferior esquerdo da tela ficavam inacessíveis por toque.
- O Nando atende do outro lado do balcão (raio de interação maior).

## Mini games integrados à história
Três desafios curtos (30–90 s), feitos para toque em 360 px e com teclado (1–6, Enter/Espaço). Todos podem ser **pulados** na abertura (acessibilidade): pular dá sempre o resultado intermediário, nunca o melhor nem o pior. Errar nunca trava a história — muda a consequência.

| Desafio | Onde | Habilidade | Consequência |
|---|---|---|---|
| **O Depoimento** | A1-M05, se o protagonista colaborou com Helena ou falou do carro prata | memória + tempo (9 s por pergunta; até 5 s conta como "firme") | 4 perguntas sobre fatos que o jogador viveu (18h10, "visto por último 18:32", sábado no bar…; ou o carro prata às 19h e a escadaria). 2 pontos firme, 1 hesitou, 0 errou. ≥6: pressão −6 e `helena_trust=alta`; 3–5: `media`; ≤2: pressão +8 e `baixa`. |
| **O Mural do Carro Prata** | Extra depois do Ato I (`A1-X1`), com Lia na cozinha | lógica / dedução | Ordenar 6 pistas da sexta com horários relativos ("dez minutos depois de…") e apontar a fala que não fecha. Achar a contradição (Miro disse que Magrão passou a tarde trancado na oficina) grava `miro_lie_hint` — pista para o Ato II. "Agora não" adia sem concluir. Saves que já terminaram o Ato I também recebem o extra ao falar com Lia. |
| **Pedidos no Balcão** | Bico no Bar do Nando (depois de A1-M02), repetível | memória + agilidade | 4 rodadas (2, 3, 4 e 5 itens). Mesmas regras do `legalGig` da v0.4 (energia 28, pressão −4, bloqueado se detido); só o pagamento vem do desempenho: R$ 90 + 100 × acertos/14 (meio da faixa = R$ 140, a média do bico sorteado legado de R$ 110–170). Nenhuma fórmula legada foi alterada. |

- O resultado é sempre gravado pelo store (`story/minigame` ou `bico/balcao`), com pontos inteiros limitados à faixa; um nó de desafio aceita um único resultado e não avança com toque. Recarregar a página durante um desafio reabre a tela de abertura dele.
- Itens do balcão são genéricos (água, café, suco, refri, pastel, pão na chapa): sem marcas e sem bebida alcoólica no bico.

## Ato II — primeiras missões (A2-M01 e A2-M02)
- **Ponte**: o Mural do Carro Prata (agora "Interlúdio") termina com o cartão "Ato II — A Ascensão / A Lei da Rua" e libera A2-M01. Saves que já tinham feito o mural na versão anterior (Ato II "em produção") são migrados ao carregar: A2-M01 fica ativa, sem mexer em mais nada.
- **A2-M01 "Nome na Rua"** (reputação narrativa): Dona Solange conta o boato — o **gesto antigo** vem de A1-M04 (`gesto`: disse não ao Miro / voltou inteiro do Cais / encarou dois homens) e o **rótulo** vem da atitude do fim do Ato I (quem protege a Vila / o novo braço do Miro / quem não abaixa a cabeça). Quem colaborou com Helena ouve que "conversou com a polícia" (`rumor_policia`). No Mural da Passarela, seu nome está escrito com bilhetes de moradores embaixo (emprego, uma "taxa" cobrada da banca, briga de vizinhos): arrancar o nome, guardar os bilhetes (+2 de respeito, uma vez) ou levar o bilhete da taxa ao Miro (Miro gosta; Solange e Jorge, não).
- **A2-M02 "A Voz de Vânia"**: Vânia Cinza na mesa do fundo do bar. **Teste de aceitação da Bíblia**: a primeira fala dela muda com `miro_first_response`, usando exatamente as falas da seção 8 (negociar / enfrentar / adiar) — coberto por teste unitário para as três respostas e por e2e. Ela propõe resolver com o Cais do Norte numa mesa em vez da retaliação de Miro, ensina três sinais e leva o protagonista à negociação.
- **Mini game "A Mesa"** (leitura + tempo): 4 rodadas sorteadas de 6, sempre com os três sinais (relógio → esperar; número repetido → pressionar; voz baixa → oferecer saída). 9 s por rodada; 2 pontos certo e rápido, 1 certo e lento. ≥6: trégua firme (+3 de respeito uma vez, pressão −5, Vânia em confiança); 3–5: trégua frágil com prazo; ≤2: fracasso (pressão +5). Negociação abstrata: sem valores, rotas ou procedimentos.
- **Decisão da Bíblia "Apoiar Vânia ou insistir em autonomia"**: apoiar / seguir o próprio caminho / contar tudo ao Miro (`vania_alliance`). Miro, Vânia, Nando, Lia e Solange reagem nas conversas do dia a dia.
- **Vânia e Helena são desenhadas por código** (sprite e retrato), no mesmo sistema procedural dos pedestres: os créditos de geração de arte acabaram. Helena ganhou retrato nas falas. Ambas estão em `RECURSOS_A_SUBSTITUIR.md`.
- **Toque em pessoa tem prioridade sobre objeto** sob o mesmo dedo: tocar na Vânia abria a TV atrás dela (achado ao jogar no navegador).
- Fictícios: Gaspar, Jorge da banca, o galpão do Cais do Norte e a União da Linha.
