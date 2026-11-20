# PROMPT MESTRE — MARGINALIDADE RPG
## Criação e implementação da versão 0.1 jogável para navegador

**Modelo de execução:** Claude Opus 5.5, raciocínio alto.
**Idioma do projeto:** português brasileiro.
**Plataforma prioritária:** navegador de celular Android; também funcionar em navegadores modernos de desktop.
**Gênero:** RPG urbano brasileiro, ficcional, de progressão persistente, exploração 2.5D, interação e narrativa ramificada.
**Identidade da campanha:** *O Preço do Poder*.
**Estado do pedido:** IMPLEMENTAÇÃO, não apenas planejamento.

## 1. Sua missão

Assuma a responsabilidade de uma equipe sênior integrada: diretor de jogo, game designer, arquiteto de software, engenheiro Phaser/TypeScript, desenvolvedor web, technical artist, designer de interface mobile, designer narrativo, sound designer, engenheiro de qualidade e especialista em performance.

Construa **Marginalidade RPG v0.1** como um novo jogo independente, derivado da base técnica e dos sistemas já existentes em **Submundo Brasil**. Não se trata de criar um site estático ou uma simulação de tela. A entrega deve conter um **jogo realmente executável**, com personagem se movimentando em uma cena, cenário com profundidade, colisões, personagens não jogáveis, diálogos, decisões, efeitos visuais, sons e os sistemas de RPG integrados.

**Regra absoluta:** nunca modificar, substituir, publicar por cima nem corromper o Submundo Brasil original. Crie uma cópia independente, com nome, repositório/diretório, configurações, armazenamento e identidade próprios.

Não peça novos alinhamentos de design como condição para iniciar. Decida detalhes não críticos com critério profissional, documentando as decisões. Se uma entrada indispensável faltar (arquivo-fonte, recurso ou permissão), informe a limitação concretamente, implemente o que for seguro e não finja que integrou algo ausente.

## 2. Entradas obrigatórias e verdade de referência

Leia integralmente os materiais anexados:

1. **Submundo-Brasil-v0.4.html** — referência técnica disponível: jogo funcional em um único arquivo HTML/CSS/JavaScript. A v0.4 é uma referência conhecida, **não uma afirmação de que seja a versão mais recente publicada**. Se houver outra versão mais recente fornecida no contexto/repositório, confirme sua integridade e use-a como origem, preservando a v0.4 para comparação.
2. **SUBMUNDO_BRASIL_BIBLIA_NARRATIVA_1.0.html** — roteiro de referência para os cinco atos, personagens, tom, missões, consequências e quatro desfechos. Atualize a marca para Marginalidade RPG sem perder a coerência da história.
3. Quaisquer imagens, sprites, áudios, arquivos de mapas, documentação, testes ou dependências efetivamente fornecidos com a base. **Nunca afirme ter recebido ou utilizado um recurso ausente.**

Antes de alterar código, inventarie os arquivos e faça uma auditoria curta: identifique o que funciona, quais módulos são reaproveitáveis, como o salvamento opera e quais pontos precisam ser extraídos da implementação monolítica. Leia AGENTS.md, README, PROJECT_CONTEXT.md, NEXT_STEPS.md e VALIDATION.md somente se esses arquivos existirem; não os invente.

**Sistemas comprovadamente presentes na base v0.4 e que precisam ser avaliados e preservados:**
- Estado persistente em navegador, exportação/importação, calendário de temporada de 30 dias e histórico;
- Dinheiro em mãos, banco, energia, pressão policial, respeito e poder;
- Atributos Astúcia, Força, Lábia e Influência; treinamento e chance de sucesso;
- Especializações Operador, Articulador e Empreendedor;
- Missões/atividades e recompensas, distritos e deslocamento, acontecimentos da cidade;
- Negócios, renda, gangue, integrantes, moral, facções fictícias, relações, tréguas, disputas territoriais e objetivos da temporada;
- Navegação inicial, Missões, Cidade, Economia, Gangue e Temporada.

Não suponha que esses sistemas já estejam modelados em TypeScript ou Phaser: o código disponível é HTML/JS monolítico. **Preserve o comportamento funcional e as fórmulas antes de refatorar ou rebalancear.** Crie testes de caracterização para as principais regras; só mude valores mediante justificativa, análise e teste.

## 3. Visão do jogo

**Marginalidade RPG** deve combinar dois modos complementares no MESMO personagem e na MESMA carreira:

**Exploração viva:** movimentação livre em pequenas áreas urbanas, NPCs, estabelecimentos, pontos de interação, atmosfera, elementos animados, som e câmera.

**RPG de progressão:** atividades recorrentes, evolução de atributos, economia, facções, relacionamentos, metas, consequências e campanha de escolhas.

Uma missão deve poder começar ao conversar com um NPC e continuar em uma interface de RPG, sem fingir um mundo aberto gigante. O bairro é um **hub explorável compacto e cheio de significado**, não um mapa vazio. O jogador deve conseguir alternar entre exploração e painéis de gestão sem perder seu estado.

O jogador começa como pessoa comum e chega progressivamente ao poder. O bairro e os personagens reagem às decisões. Evite glamourização vazia ou instruções operacionais de crimes reais. Organizações, bairros e protagonistas são fictícios; preservar a dimensão social e as consequências pessoais das ações.

## 4. Arquitetura e tecnologias

**Stack preferencial (verificar compatibilidade exata antes da instalação):**
- Phaser **4.2.1** para cena 2D, câmera, personagens, colisões, animação e renderização WebGL;
- TypeScript em modo estrito;
- Vite para desenvolvimento e build de produção;
- HTML/CSS para HUD, diálogos, configurações e telas administrativas, com eventos/tipos claros na comunicação com o jogo;
- Web Audio / sistema de áudio do Phaser para efeitos e ambientação com consentimento do usuário;
- Vitest para testes unitários e de lógica; Playwright para testes end-to-end e responsividade;
- Formatos JSON ou módulos de dados tipados para narrativa, mapas, NPCs e missões.

**Não assuma que exemplos antigos de Phaser 3 são compatíveis com Phaser 4.** Consulte documentação/API da versão instalada. Não inclua uma biblioteca pesada apenas por prestígio. Se uma API específica do Phaser 4 não funcionar, implemente uma alternativa suportada, teste-a e explique a escolha. Evite dependências por CDN no build final; utilize dependências versionadas e travadas no lockfile.

Organize módulos separados, por exemplo: `core` (estado e regras), `game` (cenas e input), `world` (mapas, interações, NPCs), `narrative` (eventos, diálogos, escolhas), `audio`, `ui`, `persistence`, `assets`, `tests`. Essa é uma orientação, não um convite à abstração excessiva.

**Um único estado autoritativo** para a carreira; o Phaser não deve manter uma versão divergente dos atributos do HTML. Use ações/eventos explícitos, validação de entradas, IDs estáveis e atualizações atômicas. Isolar o código legado antes de refatorá-lo; jamais reescrever todas as regras simultaneamente. Implemente migração de schema do novo jogo, testes de serialização e versionamento de dados.

**Armazenamento separado:** use, inicialmente, uma chave exclusiva como `marginalidade_rpg_v01`, diferente da chave original `submundo_brasil_v01`. Nunca ler, sobrescrever, limpar nem importar automaticamente o progresso do Submundo Brasil. O jogo novo deve ter exportação e importação próprias, com confirmação, validação e mensagens de erro seguras. Se o estado crescer, avalie IndexedDB; não adote backend sem necessidade na v0.1. Preparar arquitetura para futuro servidor/multiplayer, sem fingir que já existe sincronização ou segurança online.

## 5. Direção artística: cidade brasileira graphic novel 2.5D

Estilo obrigatório: graphic novel brasileira; pintura digital, contornos marcados, sombras duras, azul-petróleo, preto, âmbar de poste e toques de vermelho. Concreto desgastado, calçadas, fios, comércios, muros, luz de rua, poças e cartazes sem marcas reais. Clima urbano noturno e adulto, sem monumentos reconhecíveis, sem personagens reais, sem violência gráfica gratuita.

**2.5D significa profundidade simulada em um jogo 2D, não 3D real.** Criar:
- Camadas de cenário (fundo, fachadas, rua/chão, objetos, frente) com ordem de renderização coerente;
- Ordenação vertical de profundidade (*Y-sorting*) para que personagem passe à frente ou atrás de objetos conforme a posição;
- Parallax sutil em camadas adequadas, sem efeito artificial ao caminhar;
- Escala/perspectiva discretas, iluminação noturna, sombras e reflexos baratos em GPU;
- Pequenos elementos com movimento: letreiro luminoso sem marca, fumaça leve, luz de janela, chuva opcional, pedestres, roupa no varal;
- Animações de ociosidade, caminhada e interação do protagonista;
- Transições elegantes entre cenas, sem movimentos que prejudiquem legibilidade.

Use imagens originais efetivamente anexadas quando compatíveis e com licença adequada. **Não converta uma ilustração panorâmica automaticamente em mapa caminhável fingindo que há colisões.** Se faltarem sprites, tiles ou áudio, crie placeholders originais e funcionais, com aparência coerente, liste os recursos a substituir e mantenha o jogo totalmente executável. Não use hotlinks de imagens externas como dependência indispensável. Assets precisam ficar dentro do pacote, ou ter alternativa local.

## 6. Movimentação, mapa e interações — requisito central da v0.1

Crie um **hub explorável chamado Vila do Dique**, com tamanho enxuto, boa composição visual e interações reais. É obrigatório permitir:

- Caminhar livremente com animação visível e velocidade constante independentemente do FPS;
- Movimento por teclado no desktop: WASD/setas, tecla E ou Espaço para interagir, Esc para fechar;
- Controles por toque no celular: direcional/joystick confortável e botão contextual **Interagir**; suportar toque em alvos para selecionar/interagir quando fizer sentido;
- Colisões com limites, paredes e objetos sólidos; sem atravessar fachadas;
- Câmera acompanhando o protagonista com limites, suavidade moderada e layout adaptativo;
- Um raio de interação definido, destaque discreto para alvo próximo e indicação clara de ação disponível;
- Transição entre pelo menos um ambiente externo e um interior simples (por exemplo, o bar);
- Pelo menos três NPCs nomeados ou reconhecíveis e uma rotina simples de movimento/estado (parado, circulando, olhando, conversando), sem IA custosa;
- Pontos de interesse: casa, bar, esquina, comércio e saída/transporte, mesmo que alguns abram somente painéis simples na v0.1;
- Acessibilidade: botões grandes, áreas seguras, texto legível, contraste, controles sem exigir precisão excessiva.

Não construa seis cidades caminháveis na primeira versão. A v0.1 deve provar que **uma área pequena é agradável de explorar** e que as telas de RPG existentes funcionam. As demais cidades continuam no sistema de gestão e poderão ganhar mapas exploráveis mais tarde.

## 7. Narrativa jogável: capítulo piloto

A campanha se chama **O Preço do Poder** e segue a Bíblia Narrativa anexa. Para a v0.1, implemente de forma completa o início do Ato I:

- **A1-M01 — O Último Favor**: apresentar o bairro, a vida cotidiana, Magrão e a encomenda. O jogador caminha e conversa, não apenas lê um texto.
- **A1-M02 — A Cobrança**: confronto narrativo com Miro Ferrugem no bar; escolhas como negociar, confrontar verbalmente ou aceitar uma obrigação, respeitando a história-base.

Personagens iniciais prioritários: protagonista, **Breno “Magrão”**, **Miro Ferrugem** e **Lia** (pelo menos três NPCs visíveis no hub; se algum só aparecer na cena do bar, documente). O restante dos personagens entra nos atos seguintes.

O sistema de diálogo deve suportar retrato, nome, fala, opções, requisitos, mudanças de relacionamento, *flags*, recompensas e consequências tardias. Uma decisão do primeiro encontro deve alterar uma fala ou reação posterior **dentro do protótipo**, para demonstrar que a memória narrativa funciona. Não apresentar três botões que levam exatamente ao mesmo resultado sem reconhecimento da escolha.

Persistir capítulo, missão, flags, histórico de escolhas, estado dos NPCs importantes e gatilhos concluídos. Não repetir missões únicas a cada reload; não permitir duplicação de recompensas. Missões comuns de progressão continuam repetíveis conforme as regras legadas. Separar relógio/ciclo da temporada de passagem temporal do roteiro, sem exigir que a campanha ocorra em apenas 30 dias.

A1-M03 a A1-M05 e os Atos II a V devem ficar preparados na estrutura e claramente marcados como conteúdo futuro — **não simulados como concluídos**. Não sacrificar qualidade do piloto para preencher a interface com dezenas de missões vazias.

## 8. Núcleo RPG e balanceamento

Ao entrar em uma área ou conversar com NPC, o jogador pode acessar missões, treinos, banco, negócios, gangue, cidades, facções e temporada. Preserve inicialmente as regras existentes, inclusive especializações e efeitos nas probabilidades; qualquer alteração deve passar por teste e relatório.

Defina explicitamente o que cada ação faz no estado. Exploração visual não pode criar dinheiro, respeito, atributos ou recompensas sem uma ação válida do núcleo. Evite exploits por clique duplo, recarregamento de página, alternância de cena ou importação malformada. Faça testes do ciclo de vida da energia, da pressão policial, dos rendimentos e da persistência.

Adicionar **sinais narrativos** de lealdade, ambição e humanidade como valores internos, usados com sutileza nos diálogos. Não encher o HUD de novas barras. Relacionamentos com NPCs serão dados persistentes e separados do atributo genérico de Respeito.

Na v0.1, priorize **qualidade da experiência** sobre novas mecânicas econômicas. Não implementar multiplayer, pagamento real, backend complexo, mundo procedural infinito, centenas de NPCs ou batalhas 3D nesta etapa.

## 9. Som, música e presença

A atmosfera sonora é parte obrigatória do protótipo:
- Ambiente noturno urbano discreto (cidade, vento, movimento distante), com áudio original ou gerado localmente;
- Passos sincronizados aproximadamente ao movimento, com variação sutil;
- Som de interação, seleção, confirmação, erro, abertura de painel e transição;
- Música original ou ambiente musical opcional nas cenas narrativas, sem utilizar obras comerciais sem licença;
- Volume separado para música e efeitos, controle de som ligado/desligado, valores persistidos;
- Respeitar restrições de autoplay: áudio começa apenas após gesto explícito do usuário; mostrar opção clara **Ativar som**;
- Suspender/reduzir áudio e animações quando a aba perder visibilidade, quando adequado;
- Tratar áudio como melhoria progressiva: o jogo deve funcionar perfeitamente no mudo.

Se não houver arquivos sonoros, sintetize efeitos simples com Web Audio ou utilize áudio original criado para o projeto; não deixe botões decorativos nem links quebrados. Nunca declarar que existe narração profissional se não foi realmente produzida.

## 10. Interface e experiência mobile-first

Prioridade de teste: tela equivalente a **360 × 780 CSS px**, além de 390 × 844, tablet e desktop. O jogo precisa funcionar sem rolagem acidental da página durante o movimento, mantendo acesso fácil aos controles e respeitando recortes/safe areas.

Direção: interface editorial escura, limpa, profissional, brasileira, sem menus duplicados, sem 12 indicadores concorrentes, sem setas decorativas e sem aparência de template genérico de IA. O HUD de exploração mostra somente o indispensável: personagem, energia/pressão quando relevante, missão atual, botão de menu e ação contextual. Os atributos completos ficam nos painéis.

Criar estados claros: início/criação do personagem, exploração, diálogo, menu de RPG, inventário/painéis (somente os que existirem funcionalmente), configurações, pausa, salvamento e recuperação de erro. Usar elementos HTML semânticos para texto, foco, inputs, acessibilidade e modais. Permitir retomada após atualizar/reabrir o navegador.

Escolhas do personagem: nome/codinome, origem e especialização, reaproveitando as opções existentes sem comprometer a coerência do prólogo no Rio. Se a cidade de origem não for Rio, explicar narrativamente por que o personagem está na Vila do Dique; diferenciar *cidade natal* de *localização atual* no estado. Não remover silenciosamente as seis cidades do jogo-base.

Criar configurações de **qualidade gráfica baixa/padrão/alta**, reduzindo partículas, iluminação e resolução interna conforme necessidade. Respeitar preferência do sistema por movimento reduzido. Não exibir textos falsos como “online” ou “salvo na nuvem” quando o jogo for offline.

## 11. Desempenho, robustez e segurança

Alvos de qualidade: buscar 60 FPS em aparelhos intermediários modernos e permitir experiência estável perto de 30 FPS em dispositivos mais fracos; são **metas a medir**, não garantias. Evitar alocação excessiva por frame, renderizar apenas objetos visíveis, reutilizar partículas, comprimir assets e carregar por etapas. Limitar o DPR/resolução de renderização de forma sensata, sem prejudicar o texto HTML.

Criar fallback quando recursos WebGL avançados falharem e uma mensagem de incompatibilidade utilizável se o dispositivo não suportar nem o mínimo. Testar interrupção de áudio, perda de foco, orientação de tela, mudança de tamanho, retorno do app, atualizações de estado, autosave, arquivo de save inválido e recarregamento durante diálogo. Não executar HTML arbitrário vindo de save, nome de usuário ou arquivo JSON; validar tipos e escapar conteúdo de interface.

Não exigir conexão permanente depois que o jogo carregou, salvo recursos que realmente precisem dela e estejam declarados. Se não houver implementação PWA/offline completa, não anuncie instalação offline nem cache persistente garantido.

## 12. Ordem de trabalho — faça de verdade

**Etapa A — Auditoria e baseline:** ler base e Bíblia; documentar sistemas, dependências, pontos de integração e riscos; criar cópia independente; identificar tests baseline; preservar a fonte original no pacote como referência imutável.

**Etapa B — Projeto funcional:** iniciar Phaser + TypeScript + Vite; executar o build; configurar cena inicial, UI e estado. Não avançar com erros de compilação.

**Etapa C — Vertical slice de exploração:** implementar personagem, movimento, câmera, mapa Vila do Dique, profundidade, colisões, interior do bar, 3 NPCs, interações e atmosfera visual. Garantir que funciona com toque e teclado.

**Etapa D — Integração do RPG:** disponibilizar os sistemas da base por painéis funcionais; preservar fórmula e estado; testar que as ações impactam a carreira e que o mapa reflete mudanças relevantes.

**Etapa E — Narrativa:** construir engine de diálogos, flags, escolhas; implementar A1-M01 e A1-M02 com memória e consequência visível; manter caminho livre de progressão.

**Etapa F — Áudio, polimento e testes:** efeitos, ambiente, controles de volume, transições, configurações gráficas, acessibilidade, ajustes de performance, validação em telas móveis e correções de regressão.

**Etapa G — Entrega:** gerar build de produção executável, pacote ZIP do projeto com assets, código, dependências especificadas, testes, documentação e instruções para rodar/publicar. Só informar link online se houver deploy real bem-sucedido.

## 13. Critérios de aceite não negociáveis

Não considere a v0.1 concluída se qualquer ponto abaixo falhar:

1. Abre no Chrome Android e em navegador moderno de desktop sem erro fatal.
2. Player se move com toque e teclado, com câmera seguindo, profundidade e colisões funcionais.
3. Pelo menos uma área externa, um interior e três NPCs oferecem interações reais.
4. As duas primeiras missões narrativas podem ser iniciadas, percorridas e concluídas; escolhas persistem.
5. Ao menos uma escolha modifica um diálogo/reação posterior; missões únicas não duplicam recompensas.
6. Os sistemas legados prioritários continuam acessíveis e funcionais; não há botões ou painéis falsos apresentados como prontos.
7. Há sons ativáveis por gesto, efeitos de interação e controle de volume/mute; o jogo funciona no mudo.
8. Salvar, fechar, reabrir, exportar e importar progresso do **novo jogo** funciona com validação.
9. Nenhuma operação acessa nem modifica a chave de save ou os arquivos originais de Submundo Brasil.
10. `npm run build`, checagem TypeScript, testes unitários e e2e relevantes passam **se essas ferramentas estiverem disponíveis no ambiente**; se algum teste não puder ser executado, registre precisamente qual, por quê e o que permanece não verificado.
11. Interface utilizável a 360 × 780 CSS px, sem áreas críticas fora da tela, sem toque perdido ou scrolling acidental durante movimento.
12. Entrega contém projeto completo e build jogável, não apenas imagens, mockups, pseudocódigo ou uma lista de tarefas.

**Cenários mínimos de teste:** nova carreira → exploração → conversa → escolha → missão → salvar → recarregar → reação persistente; mudança de área; abrir/fechar painel; energia insuficiente; clique duplo; perda de foco; áudio desativado; importação inválida; arquivo de save antigo do Submundo presente no mesmo domínio.

## 14. Formato da entrega final do Opus

Responda com:

1. **Resumo técnico curto**: o que foi efetivamente implementado e o que ficou pendente.
2. **Árvore de arquivos** com módulos principais e justificativa das dependências.
3. **Projeto completo em ZIP** e **build de produção em ZIP**, ou caminhos verificáveis para os arquivos se o ambiente permitir artefatos; mantenha também README e instruções simples para quem usa apenas celular.
4. **Provas de validação**: comandos executados, seus resultados reais, screenshots se obtidas e relatório honesto de compatibilidade/performance. Não invente números de FPS nem resultados de testes.
5. **Mapa de migração** dos sistemas da v0.4, dizendo explicitamente o que foi preservado, adaptado ou ficou para a v0.2.
6. **Próximos passos priorizados** para a v0.2, sem expandir o escopo da v0.1 antes de entregar algo jogável.

**Modo de execução:** comece examinando os arquivos anexados e o repositório efetivamente acessível. Depois implemente, corrija, teste e empacote. Não pare após produzir uma proposta ou perguntar se deve continuar. Se o orçamento/contexto de execução limitar o trabalho, priorize uma vertical slice REALMENTE JOGÁVEL, com código completo e relatório preciso das lacunas, em vez de apresentar uma aplicação inacabada como finalizada.

**Definição de sucesso:** Marginalidade RPG v0.1 precisa ser reconhecível como um novo jogo brasileiro de navegador, com o personagem caminhando por uma Vila do Dique viva, um RPG funcional por trás, e o primeiro capítulo de *O Preço do Poder* reagindo ao que o jogador escolhe — sem quebrar ou alterar Submundo Brasil.
