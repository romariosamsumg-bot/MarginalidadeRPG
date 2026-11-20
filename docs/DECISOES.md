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
- Missões A1-M03 a A5-M05 aparecem na aba História como **"Em produção"**.

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
