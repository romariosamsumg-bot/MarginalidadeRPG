/**
 * Conversas repetíveis do dia a dia. Reagem às flags das missões — é aqui que a
 * memória narrativa fica visível depois de A1-M01/A1-M02.
 * Cenas `once: false` NÃO podem conceder recompensas (o validador garante).
 */
import type { Condition, Scene } from '../types';

const M02_DONE: Condition = { mission: 'A1-M02', status: 'completed' };
const M01_DONE: Condition = { mission: 'A1-M01', status: 'completed' };
const resp = (v: string): Condition => ({ flag: 'miro_first_response', eq: v });
const ACT1_DONE: Condition = { flag: 'act1_done' };
const M03_DONE: Condition = { mission: 'A1-M03', status: 'completed' };
const M04_DONE: Condition = { mission: 'A1-M04', status: 'completed' };
const attitude = (v: string): Condition => ({ flag: 'm05_attitude', eq: v });
const A2M01_DONE: Condition = { mission: 'A2-M01', status: 'completed' };
const A2M02_DONE: Condition = { mission: 'A2-M02', status: 'completed' };
const nomeResp = (v: string): Condition => ({ flag: 'nome_resposta', eq: v });
const alliance = (v: string): Condition => ({ flag: 'vania_alliance', eq: v });
const m04 = (v: string): Condition => ({ flag: 'm04_result', eq: v });

export const BARK_LIA: Scene = {
  id: 'bark-lia', mission: null, once: false, start: 'l0',
  nodes: [
    {
      id: 'l0', speaker: 'narrator', text: '',
      branch: [
        { if: { all: [A2M01_DONE, nomeResp('assumiu')] }, next: 'l_n_a' },
        { if: { all: [A2M01_DONE, nomeResp('recusou')] }, next: 'l_n_r' },
        { if: { all: [A2M01_DONE, nomeResp('miro')] }, next: 'l_n_m' },
        { if: ACT1_DONE, next: 'l_a1' },
        { if: M03_DONE, next: 'l_m3' },
        { if: { all: [M02_DONE, resp('enfrentar')] }, next: 'l_e' },
        { if: M02_DONE, next: 'l_pkg' },
        { if: M01_DONE, next: 'l_wait' },
        { if: { stage: 'talk_magrao', mission: 'A1-M01' }, next: 'l_pre' }
      ],
      next: 'l_gen'
    },
    { id: 'l_n_a', speaker: 'lia', text: 'Tu tá mesmo lendo aqueles bilhetes do mural? Cuidado, {nome}: quem resolve um problema vira dono dele.', end: true },
    { id: 'l_n_r', speaker: 'lia', text: 'Escreveram teu nome de novo no mural. Pequenininho, num canto. Parece que a Vila decidiu por tu.', end: true },
    { id: 'l_n_m', speaker: 'lia', text: 'O Jorge da banca parou de me cumprimentar. Tu sabe por quê, né?', end: true },
    {
      id: 'l_a1', speaker: 'lia', text: 'Tu entrou pro lado do Miro. Eu sei. A Vila inteira sabe.',
      variants: [{ if: { flag: 'lia_kept_out' }, text: 'Voltei da casa da tia e a primeira coisa que eu ouvi foi teu nome junto com o do Miro. Por que eu sempre sei das coisas pelos outros?' }],
      next: 'l_a1b'
    },
    {
      id: 'l_a1b', speaker: 'narrator', text: '',
      branch: [{ if: attitude('proteger'), next: 'l_a1p' }, { if: attitude('ambicao'), next: 'l_a1a' }],
      next: 'l_a1r'
    },
    { id: 'l_a1p', speaker: 'lia', text: 'Se tu fez isso pra me proteger… não me pede pra agradecer. Me pede pra continuar sendo tua irmã. Isso eu consigo.', end: true },
    { id: 'l_a1a', speaker: 'lia', text: 'Tu tá com aquele brilho no olho. O mesmo do Magrão antes de sumir. Isso me dá medo.', end: true },
    { id: 'l_a1r', speaker: 'lia', text: 'Tu tá com raiva. Eu também. Só não deixa essa raiva virar o teu jeito de ser.', end: true },
    {
      id: 'l_m3', speaker: 'lia', text: 'Falou com a Dona Solange? …Tá. Só me promete que tu vai voltar pra jantar.',
      variants: [{ if: { flag: 'lia_informed', eq: true }, text: 'A gente vai dar um jeito nessa conta. Junto. Não esquece que tu prometeu.' }],
      end: true
    },
    { id: 'l_pre', speaker: 'lia', text: 'Vai sair? Tô estudando pra prova de segunda. Se fizer barulho na volta, eu tranco a porta.', next: 'l_pre2' },
    { id: 'l_pre2', speaker: 'lia', text: 'O Magrão passou aqui mais cedo. Tava estranho. Nem aceitou café.', end: true },
    { id: 'l_wait', speaker: 'lia', text: 'Tu vai no bar a essa hora? …Manda mensagem quando chegar. E não me olha com essa cara.', end: true },
    { id: 'l_e', speaker: 'lia', text: 'A Vila inteira tá comentando que tu respondeu o Miro no bar. Tu tem noção do que fez?', next: 'l_pkg' },
    {
      id: 'l_pkg', speaker: 'narrator', text: '',
      branch: [
        { if: { flag: 'lia_package_answer', eq: 'verdade' }, next: 'l_v' },
        { if: { flag: 'lia_package_answer', eq: 'desconversou' }, next: 'l_d' }
      ],
      next: 'l_s'
    },
    { id: 'l_v', speaker: 'lia', text: 'Tem a ver com a caixa do Magrão, não tem? Tu me prometeu que eu ia saber primeiro.', next: 'l_v2' },
    { id: 'l_v2', speaker: 'lia', text: 'Eu não vou fingir que não percebi. Quando quiser falar, eu tô aqui.', end: true },
    { id: 'l_d', speaker: 'lia', text: 'Tu tá estranho desde sexta. E não, eu não vou perguntar de novo.', end: true },
    { id: 'l_s', speaker: 'lia', text: 'Ainda bem que tu não ficou com nada dele.', next: 'l_s2' },
    { id: 'l_s2', speaker: 'lia', text: '…Não ficou, né?', end: true },
    { id: 'l_gen', speaker: 'lia', text: 'Tô aqui fora porque lá dentro o sinal não pega. Vai lá, {nome}.', end: true }
  ]
};

export const BARK_SOLANGE: Scene = {
  id: 'bark-solange', mission: null, once: false, start: 's0',
  nodes: [
    {
      id: 's0', speaker: 'narrator', text: '',
      branch: [
        { if: { all: [A2M01_DONE, nomeResp('miro')] }, next: 's_n_m' },
        { if: A2M01_DONE, next: 's_nome' },
        { if: ACT1_DONE, next: 's_a1' },
        { if: { all: [M03_DONE, { flag: 'solange_ally' }] }, next: 's_ally' },
        { if: M03_DONE, next: 's_m3' },
        { if: { all: [M02_DONE, resp('enfrentar')] }, next: 's_e' },
        { if: { all: [M02_DONE, resp('negociar')] }, next: 's_n' },
        { if: { all: [M02_DONE, resp('adiar')] }, next: 's_a' },
        { if: { flag: 'magrao_missing' }, next: 's_m' }
      ],
      next: 's_pre'
    },
    { id: 's_n_m', speaker: 'solange', text: 'O Jorge me contou do bilhete que foi parar no bolso do Miro. Eu não esperava isso de tu, {nome}.', next: 's_end' },
    { id: 's_nome', speaker: 'solange', text: 'Tem gente perguntando se tu vai mesmo resolver os pedidos do mural. Eu digo que não sei. E não sei mesmo.', next: 's_end' },
    { id: 's_a1', speaker: 'solange', text: 'Tão dizendo que agora tu é da União da Linha. Eu não vou te tratar diferente. Mas a Vila vai.', next: 's_end' },
    { id: 's_ally', speaker: 'solange', text: 'Nada do carro prata ainda. Se aparecer, tu fica sabendo antes de todo mundo.', next: 's_end' },
    { id: 's_m3', speaker: 'solange', text: 'O que eu te contei fica entre nós, ouviu? Na Vila, quem fala demais some igual o Magrão.', next: 's_end' },
    { id: 's_pre', speaker: 'solange', text: 'Boa tarde, {nome}. Leva um pão? Acabou de sair.', next: 's_pre2' },
    { id: 's_pre2', speaker: 'solange', text: 'E diz pro Magrão que ele me deve o conserto da bicicleta faz um mês.', next: 's_end' },
    { id: 's_m', speaker: 'solange', text: 'Soube do Magrão? Ninguém vê ele desde sexta. A mãe dele já passou aqui duas vezes.', next: 's_end' },
    { id: 's_e', speaker: 'solange', text: 'Ouvi dizer que tu respondeu o Miro no bar. Toma cuidado. Coragem aqui é coisa que a gente paga parcelado.', next: 's_end' },
    { id: 's_n', speaker: 'solange', text: 'Dizem por aí que tu ficou de resolver um problema do Miro. Não precisa me contar nada. Só olha onde pisa.', next: 's_end' },
    { id: 's_a', speaker: 'solange', text: 'O Nando falou que tu soube sair do bar sem confusão. Já é alguma coisa.', next: 's_end' },
    {
      id: 's_end', speaker: 'solange', text: 'O balcão do correspondente tá aberto, se precisar pagar alguma conta ou guardar dinheiro.',
      choices: [
        { id: 'servicos', label: 'Ver banco e negócios', openPanel: 'economia', next: 'END' },
        { id: 'tchau', label: 'Até mais, Dona Solange', next: 'END' }
      ]
    }
  ]
};

export const BARK_NANDO: Scene = {
  id: 'bark-nando', mission: null, once: false, start: 'n0',
  nodes: [
    {
      id: 'n0', speaker: 'narrator', text: '',
      branch: [
        { if: { flag: 'tregua_cais', eq: 'firme' }, next: 'n_tf' },
        { if: { flag: 'tregua_cais', eq: 'fracasso' }, next: 'n_tx' },
        { if: ACT1_DONE, next: 'n_a1' },
        { if: { all: [M02_DONE, resp('negociar')] }, next: 'n_n' },
        { if: { all: [M02_DONE, resp('enfrentar')] }, next: 'n_e' },
        { if: { all: [M02_DONE, resp('adiar')] }, next: 'n_a' },
        { if: { stage: 'go_bar', mission: 'A1-M02' }, next: 'n_go' }
      ],
      next: 'n_pre'
    },
    { id: 'n_tf', speaker: 'nando', text: 'Disseram que o pessoal do Cais não aparece mais por aqui. E que foi tu que sentou com eles. Eu… obrigado. Só isso.', next: 'n_menu' },
    { id: 'n_tx', speaker: 'nando', text: 'Tô fechando mais cedo. O pessoal do Cais passou de carro duas vezes ontem. Devagar.', next: 'n_menu' },
    { id: 'n_a1', speaker: 'nando', text: 'Tô inteiro. Quase. Dois pontos na testa e um susto que não sai.', next: 'n_a1b' },
    { id: 'n_a1b', speaker: 'nando', text: 'Eu não dei teu nome pra ninguém, {nome}. Juro. Alguém quis que parecesse que eu dei.', next: 'n_menu' },
    { id: 'n_pre', speaker: 'nando', text: 'Fala, {nome}. Hoje tá parado. Quer uma água, um refri?', next: 'n_menu' },
    { id: 'n_go', speaker: 'nando', text: 'Ainda bem que tu veio. Fala baixo.', next: 'n_menu' },
    { id: 'n_n', speaker: 'nando', text: 'Pedir tempo pro Miro… tu é mais frio do que eu pensava. Não sei se isso é bom.', next: 'n_menu' },
    { id: 'n_e', speaker: 'nando', text: 'Tu tá maluco? Ninguém responde o Miro assim aqui dentro. Amanhã a Vila inteira vai tá sabendo.', next: 'n_menu' },
    { id: 'n_a', speaker: 'nando', text: 'Fez bem em não esticar. Mas ele vai cobrar esse "amanhã", pode ter certeza.', next: 'n_menu' },
    {
      id: 'n_menu', speaker: 'nando', text: 'Aqui é onde a Vila conversa. Quer saber como andam os grupos da cidade?',
      variants: [
        { if: ACT1_DONE, text: 'Com essa mão enfaixada eu não dou conta do balcão. Me dá uma força? Pago o dia. Ou quer saber dos grupos da cidade?' },
        { if: M02_DONE, text: 'Depois daquela noite o movimento aumentou — todo mundo quer ver a cara de quem respondeu o Miro. Me ajuda no balcão? Ou quer saber dos grupos da cidade?' }
      ],
      choices: [
        {
          id: 'balcao', label: 'Dar uma força no balcão (bico)', showIf: M02_DONE,
          requires: { energy: 28 }, requiresLabel: 'Requer 28 de energia — descanse no sofá de casa',
          openMinigame: 'pedidos', next: 'END'
        },
        { id: 'grupos', label: 'Perguntar sobre os grupos da cidade', openPanel: 'gangue', next: 'END' },
        { id: 'nada', label: 'Agora não', next: 'END' }
      ]
    }
  ]
};

export const BARK_MIRO: Scene = {
  id: 'bark-miro', mission: null, once: false, start: 'm0',
  nodes: [
    {
      id: 'm0', speaker: 'narrator', text: '',
      branch: [
        { if: alliance('apoio'), next: 'm_v_a' },
        { if: alliance('miro'), next: 'm_v_m' },
        { if: alliance('autonomia'), next: 'm_v_x' },
        { if: ACT1_DONE, next: 'm_a1' },
        { if: { all: [M04_DONE, m04('recusou')] }, next: 'm_r' },
        { if: { all: [M04_DONE, m04('falha')] }, next: 'm_f' },
        { if: M04_DONE, next: 'm_s' },
        { if: resp('negociar'), next: 'm_n' },
        { if: resp('enfrentar'), next: 'm_e' },
        { if: resp('adiar'), next: 'm_a' }
      ],
      next: 'm_gen'
    },
    { id: 'm_v_a', speaker: 'miro', text: 'A Vânia fala bonito, né? Eu te avisei que ela falava bonito.', end: true },
    { id: 'm_v_m', speaker: 'miro', text: 'Fez bem em me contar da mesa. A Vânia joga do lado dela. Sempre jogou.', end: true },
    { id: 'm_v_x', speaker: 'miro', text: 'Nem comigo, nem com ela. Tu acha mesmo que dá pra ficar no meio da rua?', end: true },
    {
      id: 'm_a1', speaker: 'miro', text: 'Agora tu é da casa. Fica por perto — quando a Vânia chamar, tu vai.',
      variants: [{ if: attitude('ressentimento'), text: 'Ainda com essa cara? Vai passar. Ou não. Tanto faz, desde que tu chegue na hora.' }],
      end: true
    },
    { id: 'm_r', speaker: 'miro', text: 'Quem recusa serviço fica devendo em dobro. Lembra disso.', end: true },
    { id: 'm_f', speaker: 'miro', text: 'Voltou de mão vazia do Cais e ainda tem coragem de aparecer. Gosto de gente teimosa. Até certo ponto.', end: true },
    { id: 'm_s', speaker: 'miro', text: 'Serviço limpo. Tu tem jeito pra coisa — e isso não é elogio.', end: true },
    { id: 'm_n', speaker: 'miro', text: 'Tá contando o tempo, né? Eu também.', next: 'm_pkg' },
    { id: 'm_e', speaker: 'miro', text: 'Olha quem apareceu. Coragem de sobra e juízo nenhum.', next: 'm_pkg' },
    { id: 'm_a', speaker: 'miro', text: 'Amanhã é logo ali. Não esquece.', next: 'm_pkg' },
    { id: 'm_gen', speaker: 'miro', text: 'Circulando.', end: true },
    {
      id: 'm_pkg', speaker: 'narrator', text: '',
      branch: [
        { if: { flag: 'package_answer', eq: 'admitiu' }, next: 'm_adm' },
        { if: { flag: 'package_answer', eq: 'desviou' }, next: 'm_dev' }
      ],
      next: 'm_end'
    },
    { id: 'm_adm', speaker: 'miro', text: 'E a caixa? Continua fechada, espero.', end: true },
    { id: 'm_dev', speaker: 'miro', text: '"O que tu acha que ele deixou?" Eu ainda tô rindo dessa.', end: true },
    { id: 'm_end', speaker: 'miro', text: 'Some daqui. Mas não da Vila.', end: true }
  ]
};

export const BARK_ZE: Scene = {
  id: 'bark-ze', mission: null, once: false, start: 'z0',
  nodes: [
    { id: 'z0', speaker: 'narrator', text: '', branch: [{ if: ACT1_DONE, next: 'z_a1' }, { if: { mission: 'A1-M05', status: 'active' }, next: 'z_m5' }, { if: M02_DONE, next: 'z_post' }], next: 'z_pre' },
    { id: 'z_m5', speaker: 'ze', text: 'O Miro tá lá fora te esperando. Eu, se fosse tu, pensava duas vezes. Mas eu nunca fui tu.', end: true },
    { id: 'z_a1', speaker: 'ze', text: 'Já vi muito menino entrar nessa achando que ia mandar. A rua é que manda. Sempre mandou.', end: true },
    { id: 'z_pre', speaker: 'ze', text: 'Na minha época, a Vila tinha baile todo sábado. Agora tem é medo.', end: true },
    { id: 'z_post', speaker: 'ze', text: 'Vi tudo, viu? Não vi nada. É assim que se vive muito por aqui.', end: true }
  ]
};

export const BARK_VANIA: Scene = {
  id: 'bark-vania', mission: null, once: false, start: 'v0',
  nodes: [
    {
      id: 'v0', speaker: 'narrator', text: '',
      branch: [
        { if: { all: [A2M02_DONE, alliance('apoio')] }, next: 'v_a' },
        { if: { all: [A2M02_DONE, alliance('autonomia')] }, next: 'v_x' },
        { if: { all: [A2M02_DONE, alliance('miro')] }, next: 'v_m' }
      ],
      next: 'v_pre'
    },
    { id: 'v_pre', speaker: 'vania', text: 'Senta quando for a hora. Ainda não é.', end: true },
    { id: 'v_a', speaker: 'vania', text: 'Tô de olho no Gaspar. E no Miro. Tu cuida do teu nome — o resto eu vejo.', next: 'v_t' },
    { id: 'v_x', speaker: 'vania', text: 'Quem anda sem dono precisa enxergar dobrado. Tá enxergando?', next: 'v_t' },
    { id: 'v_m', speaker: 'vania', text: 'Tu fez tua escolha. Eu faço as minhas. Sem rancor — rancor é caro.', next: 'v_t' },
    {
      id: 'v_t', speaker: 'vania', text: 'A trégua com o Cais tá de pé. Por enquanto.',
      variants: [
        { if: { flag: 'tregua_cais', eq: 'fragil' }, text: 'Faltam poucos dias pro prazo do Gaspar. Ninguém da Vila perto do galpão, ouviu?' },
        { if: { flag: 'tregua_cais', eq: 'fracasso' }, text: 'O Gaspar não atende mais. Vou achar outro caminho. Sempre tem.' }
      ],
      end: true
    }
  ]
};

export const BARK_MAGRAO: Scene = {
  id: 'bark-magrao', mission: null, once: false, start: 'g1',
  nodes: [{ id: 'g1', speaker: 'magrao', text: 'Agora não dá, tô fechando. Passa depois.', end: true }]
};

/** Pontos de interesse com descrição curta (sem recompensas). */
export const POI_OFICINA: Scene = {
  id: 'poi-oficina', mission: null, once: false, start: 'p1',
  nodes: [
    { id: 'p1', speaker: 'narrator', text: '', branch: [{ if: { flag: 'oficina_closed' }, next: 'p_closed' }], next: 'p_open' },
    { id: 'p_open', speaker: 'narrator', text: 'Ferramentas penduradas, pneus empilhados, um rádio sem antena. A Oficina 24 é o lugar onde Magrão passa mais tempo do que em casa.', end: true },
    { id: 'p_closed', speaker: 'narrator', text: 'A porta de aço está baixada. Alguém colou um papel com fita: "FECHADO ATÉ SEGUNDA ORDEM".', end: true }
  ]
};

export const POI_TV: Scene = {
  id: 'poi-tv', mission: null, once: false, start: 't1',
  nodes: [{ id: 't1', speaker: 'narrator', text: 'Na TV, um programa repete as mesmas imagens de sempre. Ninguém está assistindo de verdade.', end: true }]
};

export const BARKS: Scene[] = [BARK_LIA, BARK_SOLANGE, BARK_NANDO, BARK_MIRO, BARK_ZE, BARK_VANIA, BARK_MAGRAO, POI_OFICINA, POI_TV];
