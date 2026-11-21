/**
 * Ato I — capítulo piloto: A1-M01 "O Último Favor" e A1-M02 "A Cobrança".
 * Roteiro-base: Bíblia Narrativa 1.0, seção 8 (falas-chave preservadas; marca atualizada).
 * Regras editoriais: nada de procedimento criminal real; a encomenda é uma caixa fechada
 * sem conteúdo descrito; nenhuma dívida monetária é debitada na cobrança.
 */
import type { Scene } from '../types';

const M01 = 'A1-M01';
const M02 = 'A1-M02';

export const INTRO: Scene = {
  id: 'A1-intro', mission: null, once: true, music: 'theme', start: 'i1',
  nodes: [
    {
      id: 'i1', speaker: 'narrator', style: 'card', art: 'vila',
      text: 'Vila do Dique, região metropolitana do Rio de Janeiro. Você nasceu em {cidade}, mas chegou aqui há seis anos, quando a família de Lia abriu a porta de casa para você. Desde então, a Vila também é sua.',
      variants: [{ if: { homeCity: 'Rio de Janeiro' }, text: 'Vila do Dique, região metropolitana do Rio de Janeiro. Você cresceu aqui: conhece cada degrau da escadaria, cada portão que range, cada vizinho pelo apelido.' }],
      next: 'i2'
    },
    {
      id: 'i2', speaker: 'narrator', style: 'card', art: 'encomenda',
      text: 'Lia é sua prima — quase irmã. Magrão, o mecânico da Oficina 24, é seu amigo desde sempre. Os dois são o mais perto de família que você tem por aqui.',
      next: 'i3'
    },
    {
      id: 'i3', speaker: 'narrator', style: 'phone', text: 'Mensagens de Magrão',
      phone: [
        { from: 'them', who: 'Magrão', time: '17:52', text: 'passa na oficina antes d eu fechar' },
        { from: 'them', who: 'Magrão', time: '17:53', text: 'é rapido' },
        { from: 'them', who: 'Magrão', time: '17:58', text: 'por favor' }
      ],
      next: 'i4'
    },
    {
      id: 'i4', speaker: 'narrator', style: 'card', text: 'Sexta-feira, 18h10.\nTodo império começa com uma escolha.',
      effects: [{ type: 'setFlag', key: 'intro_seen', value: true }],
      end: true
    }
  ]
};

const acceptEffects = [
  { type: 'setFlag', key: 'magrao_initial_trust', value: true },
  { type: 'item', id: 'encomenda', has: true },
  { type: 'relation', npc: 'magrao', delta: 10, state: 'confianca' },
  { type: 'trait', trait: 'lealdade', delta: 1 }
] as const;
const refuseEffects = [
  { type: 'setFlag', key: 'refused_package', value: true },
  { type: 'relation', npc: 'magrao', delta: -8, state: 'distancia' }
] as const;

export const A1_M01_OFICINA: Scene = {
  id: 'A1-M01-oficina', mission: M01, once: true, music: 'theme', title: 'O Último Favor', location: 'Oficina 24 — fim de tarde', start: 'o1',
  nodes: [
    { id: 'o1', speaker: 'narrator', text: 'A Oficina 24 está fechando. O cheiro de óleo queimado se mistura ao da chuva que ainda não caiu. Uma moto passa devagar e some na curva.', next: 'o2', mood: 'tense' },
    { id: 'o2', speaker: 'magrao', text: 'Aí. Chegou na hora.', next: 'o3' },
    { id: 'o3', speaker: 'magrao', text: 'Preciso te pedir uma parada. Só hoje. Amanhã eu volto e resolvo.', next: 'o4' },
    { id: 'o4', speaker: 'player', text: 'Desde quando tu fala desse jeito comigo?', next: 'o5' },
    { id: 'o5', speaker: 'magrao', text: 'Desde que eu fiquei sem muita escolha.', next: 'o6' },
    { id: 'o6', speaker: 'narrator', text: 'Ele puxa de baixo da bancada uma caixa de papelão fechada com fita marrom. Leve. Nenhuma etiqueta, nenhum nome.', next: 'o7' },
    {
      id: 'o7', speaker: 'magrao', text: 'Guarda isso pra mim até amanhã. Não abre. Não mostra pra ninguém.',
      choices: [
        { id: 'perguntar', label: 'Perguntar o que aconteceu', say: 'Magrão. O que tá acontecendo?', effects: [{ type: 'setFlag', key: 'asked_magrao_truth', value: true }], memory: 'Você perguntou a Magrão o que estava acontecendo.', next: 'o8' },
        { id: 'aceitar', label: 'Aceitar ajudar por amizade', say: 'Tá. Por ti eu guardo.', effects: [...acceptEffects], memory: 'Você aceitou guardar a caixa de Magrão.', next: 'o12' },
        { id: 'recusar', label: 'Recusar participar', say: 'Não, Magrão. Não sem saber o que é.', effects: [...refuseEffects], memory: 'Você recusou guardar a caixa de Magrão.', next: 'o15' }
      ]
    },
    { id: 'o8', speaker: 'magrao', text: 'Melhor tu não saber. Sério. Quanto menos tu souber, mais fácil fica pra ti.', next: 'o9' },
    { id: 'o9', speaker: 'player', text: 'Isso não me deixa mais tranquilo, não.', next: 'o10' },
    {
      id: 'o10', speaker: 'magrao', text: 'Nem a mim.',
      choices: [
        { id: 'aceitar_mesmo', label: 'Aceitar mesmo assim', say: 'Tá bom. Eu guardo. Mas amanhã tu me explica.', effects: [...acceptEffects], memory: 'Você aceitou guardar a caixa de Magrão, mesmo sem explicação.', next: 'o12' },
        { id: 'recusar_sem', label: 'Recusar sem explicação', say: 'Sem explicação, eu não consigo.', effects: [...refuseEffects], memory: 'Você recusou guardar a caixa sem uma explicação.', next: 'o15' }
      ]
    },
    {
      id: 'o12', speaker: 'magrao', text: 'Eu sabia que podia contar contigo. Sempre pude.',
      variants: [{ if: { flag: 'asked_magrao_truth' }, text: 'Valeu. E desculpa não poder falar mais. Amanhã tu entende.' }],
      next: 'o13'
    },
    { id: 'o13', speaker: 'magrao', text: 'Amanhã eu passo na tua casa. Palavra.', next: 'o14' },
    {
      id: 'o14', speaker: 'narrator', text: 'A caixa pesa quase nada. Mesmo assim, você sente o peso dela no caminho inteiro.',
      effects: [
        { type: 'stage', mission: M01, stage: 'store_package' },
        { type: 'npc', id: 'magrao', present: false },
        { type: 'setFlag', key: 'oficina_closed', value: true }
      ],
      end: true
    },
    { id: 'o15', speaker: 'magrao', text: 'Tá certo. Tá certo. Tu tem razão.', next: 'o16' },
    { id: 'o16', speaker: 'magrao', text: 'Esquece que eu pedi.', next: 'o17' },
    {
      id: 'o17', speaker: 'narrator', text: 'Ele enfia a caixa na mochila, baixa a porta de aço até a metade e sai pela lateral, sem olhar para trás.',
      effects: [
        { type: 'stage', mission: M01, stage: 'go_home' },
        { type: 'npc', id: 'magrao', present: false },
        { type: 'setFlag', key: 'oficina_closed', value: true }
      ],
      end: true
    }
  ]
};

export const A1_M01_CASA: Scene = {
  id: 'A1-M01-casa', mission: M01, once: true, music: 'theme', title: 'O Último Favor', location: 'Sua casa — noite', start: 'h0',
  nodes: [
    { id: 'h0', speaker: 'narrator', text: '', branch: [{ if: { item: 'encomenda' }, next: 'h1' }], next: 'h10' },
    { id: 'h1', speaker: 'narrator', text: 'Em casa, Lia está na mesa da cozinha, cercada de apostilas. O ventilador de chão vira de um lado para o outro.', next: 'h2' },
    {
      id: 'h2', speaker: 'lia', text: 'Que caixa é essa?',
      choices: [
        {
          id: 'verdade', label: 'Contar a verdade', say: 'É do Magrão. Pediu pra eu guardar até amanhã.',
          effects: [{ type: 'setFlag', key: 'lia_package_answer', value: 'verdade' }, { type: 'relation', npc: 'lia', delta: 8, state: 'confianca' }, { type: 'trait', trait: 'humanidade', delta: 1 }],
          memory: 'Você contou a Lia que a caixa era de Magrão.', next: 'h3'
        },
        {
          id: 'desconversar', label: 'Desconversar', say: 'Coisa do trabalho. Nada demais.',
          effects: [{ type: 'setFlag', key: 'lia_package_answer', value: 'desconversou' }, { type: 'relation', npc: 'lia', delta: -6, state: 'distancia' }],
          memory: 'Você escondeu de Lia de quem era a caixa.', next: 'h5'
        }
      ]
    },
    { id: 'h3', speaker: 'lia', text: 'Do Magrão?', next: 'h4' },
    { id: 'h4', speaker: 'lia', text: 'Tá. Guarda no teu quarto. Mas se isso der problema, eu quero saber primeiro, ouviu?', next: 'h20' },
    { id: 'h5', speaker: 'lia', text: 'Coisa do trabalho. Sei.', next: 'h6' },
    { id: 'h6', speaker: 'narrator', text: 'Ela volta para a apostila, mas não vira a página.', next: 'h20' },
    { id: 'h10', speaker: 'narrator', text: 'Em casa, Lia está na mesa da cozinha, cercada de apostilas.', next: 'h11' },
    { id: 'h11', speaker: 'lia', text: 'Voltou cedo. O Magrão te achou?', next: 'h12' },
    { id: 'h12', speaker: 'player', text: 'Achou. Queria que eu guardasse uma coisa pra ele. Eu disse que não.', next: 'h13' },
    { id: 'h13', speaker: 'lia', text: 'Fez bem.', next: 'h14' },
    { id: 'h14', speaker: 'lia', text: '…Eu acho.', effects: [{ type: 'setFlag', key: 'lia_package_answer', value: 'sem_caixa' }], next: 'h20' },
    { id: 'h20', speaker: 'narrator', text: 'Mais tarde, no escuro do quarto, você escreve para Magrão.', next: 'h21', mood: 'sad' },
    {
      id: 'h21', speaker: 'narrator', style: 'phone', text: 'Conversa com Magrão',
      phone: [
        { from: 'me', time: '22:14', text: 'chegou bem?' },
        { from: 'me', time: '23:50', text: 'magrão?' },
        { from: 'system', time: '', text: 'Sábado' },
        { from: 'me', time: '08:02', text: 'responde aí' },
        { from: 'me', time: '13:37', text: 'cara, me dá um sinal' },
        { from: 'system', time: '', text: 'Visto por último: sexta-feira, 18:32' }
      ],
      next: 'h22'
    },
    {
      id: 'h22', speaker: 'narrator', style: 'card', art: 'oficina_fechada', text: 'Magrão não voltou.',
      effects: [
        { type: 'clock', label: 'Sábado, 23h40', timeOfDay: 'noite' },
        { type: 'setFlag', key: 'magrao_missing', value: true },
        { type: 'npc', id: 'lia', present: true, spot: 'casa_noite' }
      ],
      next: 'h23'
    },
    {
      id: 'h23', speaker: 'narrator', style: 'phone', text: 'Mensagem de Nando',
      phone: [
        { from: 'them', who: 'Nando (bar)', time: '23:31', text: 'aqui é o nando do bar' },
        { from: 'them', who: 'Nando (bar)', time: '23:31', text: 'tem um pessoal aqui perguntando de tu' },
        { from: 'them', who: 'Nando (bar)', time: '23:32', text: 'melhor tu vir' }
      ],
      effects: [
        { type: 'mission', id: M01, status: 'completed' },
        { type: 'log', msg: 'O Último Favor: Magrão não voltou.' },
        { type: 'mission', id: M02, status: 'active', stage: 'go_bar' },
        { type: 'npc', id: 'miro', present: true, spot: 'bar_mesa' }
      ],
      end: true
    }
  ]
};

export const A1_M02_COBRANCA: Scene = {
  id: 'A1-M02-cobranca', mission: M02, once: true, music: 'theme', title: 'A Cobrança', location: 'Bar do Nando — 23h40', start: 'b1',
  nodes: [
    {
      id: 'b1', speaker: 'narrator', mood: 'tense',
      text: 'O bar está quase vazio. O ventilador range. Nando enxuga o mesmo copo pela terceira vez e evita olhar para a porta.',
      effects: [{ type: 'stage', mission: M02, stage: 'confront' }], next: 'b2'
    },
    { id: 'b2', speaker: 'narrator', text: 'O homem da mesa do fundo puxa uma cadeira na sua frente, sem pedir licença. Todo mundo na Vila sabe o nome dele: Miro Ferrugem.', next: 'b3' },
    { id: 'b3', speaker: 'miro', text: 'Teu amigo sumiu. E deixou problema.', next: 'b4' },
    { id: 'b4', speaker: 'player', text: 'Não sei onde ele tá.', next: 'b5' },
    { id: 'b5', speaker: 'miro', text: 'Não foi isso que eu perguntei.', next: 'b6' },
    { id: 'b6', speaker: 'player', text: 'Então pergunta direito.', next: 'b7' },
    { id: 'b7', speaker: 'miro', text: 'Quero saber se tu vai resolver ou se vai fingir que nada aconteceu.', next: 'b8' },
    { id: 'b8', speaker: 'narrator', text: '', branch: [{ if: { flag: 'refused_package' }, next: 'b9r' }, { if: { item: 'encomenda' }, next: 'b9a' }], next: 'b10' },
    { id: 'b9r', speaker: 'miro', text: 'Me contaram que ele te procurou ontem na oficina. Que tu mandou ele embora.', next: 'b9r2' },
    { id: 'b9r2', speaker: 'miro', text: 'Bonito. Mas o teu nome tá do lado do dele em tudo quanto é conversa.', next: 'b9r3' },
    { id: 'b9r3', speaker: 'player', text: 'Eu não tenho nada a ver com isso.', next: 'b9r4' },
    { id: 'b9r4', speaker: 'miro', text: 'Quem decide isso não é tu.', next: 'b10' },
    { id: 'b9a', speaker: 'miro', text: 'E nem adianta fazer essa cara. Ele passou a tarde inteira na oficina esperando alguém. Esperando tu.', next: 'b10' },
    {
      id: 'b10', speaker: 'miro', text: 'Magrão tava devendo. Pra gente que não esquece. Agora a conta tá no teu nome.',
      choices: [
        {
          id: 'negociar', label: 'Tentar negociar', say: 'Me dá tempo. Eu descubro o que aconteceu.',
          effects: [{ type: 'setFlag', key: 'miro_first_response', value: 'negociar' }, { type: 'relation', npc: 'miro', delta: 0, state: 'distancia' }, { type: 'trait', trait: 'ambicao', delta: 1 }],
          memory: 'Você pediu tempo a Miro.', next: 'b11n'
        },
        {
          id: 'enfrentar', label: 'Enfrentar Miro verbalmente', say: 'Tu tá me cobrando por uma coisa que nem explica.',
          effects: [{ type: 'setFlag', key: 'miro_first_response', value: 'enfrentar' }, { type: 'relation', npc: 'miro', delta: -20, state: 'conflito' }, { type: 'trait', trait: 'lealdade', delta: 1 }],
          memory: 'Você enfrentou Miro na frente de todo o bar.', next: 'b11e'
        },
        {
          id: 'adiar', label: 'Aceitar conversar depois', say: 'Eu volto amanhã. A gente conversa sem plateia.',
          effects: [{ type: 'setFlag', key: 'miro_first_response', value: 'adiar' }, { type: 'relation', npc: 'miro', delta: 5, state: 'distancia' }, { type: 'trait', trait: 'humanidade', delta: 1 }],
          memory: 'Você deixou a conversa com Miro para depois.', next: 'b11a'
        }
      ]
    },
    { id: 'b11n', speaker: 'miro', text: 'Tempo é a única coisa que ninguém aqui tem de sobra.', next: 'b12n' },
    { id: 'b12n', speaker: 'miro', text: 'Mas tu pensa antes de abrir a boca. Isso eu sei usar.', next: 'b20' },
    { id: 'b11e', speaker: 'miro', text: 'Olha só. Tem coragem.', next: 'b12e' },
    { id: 'b12e', speaker: 'miro', text: 'Vamos ver se tem juízo também.', next: 'b20' },
    { id: 'b11a', speaker: 'miro', text: 'Amanhã, então. Eu não gosto de repetir recado.', next: 'b20' },
    { id: 'b20', speaker: 'narrator', text: '', branch: [{ if: { item: 'encomenda' }, next: 'b21' }], next: 'b25' },
    {
      id: 'b21', speaker: 'miro', text: 'Uma última coisa. Ele deixou alguma coisa contigo?',
      choices: [
        {
          id: 'negar', label: 'Negar', say: 'Não deixou nada.',
          effects: [{ type: 'setFlag', key: 'package_answer', value: 'negou' }, { type: 'trait', trait: 'lealdade', delta: 1 }],
          memory: 'Você negou a Miro que guardava algo de Magrão.', next: 'b22n'
        },
        {
          id: 'admitir', label: 'Dizer que a caixa está guardada', say: 'Deixou uma caixa. Tá guardada. Ninguém abriu.',
          effects: [{ type: 'setFlag', key: 'package_answer', value: 'admitiu' }, { type: 'relation', npc: 'miro', delta: 5 }],
          memory: 'Você contou a Miro sobre a caixa.', next: 'b22a'
        },
        {
          id: 'devolver', label: 'Devolver a pergunta', say: 'Depende. O que tu acha que ele deixou?',
          requires: { stat: 'labia', gte: 6 }, requiresLabel: 'Requer Lábia 6 — treine em Missões › Centro de treinamento',
          effects: [{ type: 'setFlag', key: 'package_answer', value: 'desviou' }, { type: 'setFlag', key: 'miro_tested', value: true }, { type: 'trait', trait: 'ambicao', delta: 1 }],
          memory: 'Você devolveu a pergunta de Miro sem entregar nada.', next: 'b22d'
        }
      ]
    },
    {
      id: 'b22n', speaker: 'miro', text: 'Espero que seja verdade. Mentira aqui sai caro.',
      variants: [{ if: { flag: 'miro_first_response', eq: 'enfrentar' }, text: 'Me peitar e depois mentir pra mim? Tu gosta de risco.' }],
      next: 'b25'
    },
    { id: 'b22a', speaker: 'miro', text: 'Então guarda bem. Ninguém abre, ninguém mexe. Quando for a hora, eu mando buscar.', next: 'b25' },
    { id: 'b22d', speaker: 'miro', text: 'Hum. Tu sabe jogar. Vou lembrar disso.', next: 'b25' },
    { id: 'b25', speaker: 'narrator', text: 'Nando baixa o volume da televisão. Miro se levanta.', next: 'b26' },
    { id: 'b26', speaker: 'miro', text: 'Uma hora a verdade aparece. Até lá, é bom tu não sumir também.', next: 'b27' },
    {
      id: 'b27', speaker: 'narrator', text: 'Ele deixa uma nota amassada no balcão para pagar uma cerveja que não bebeu e sai sem fechar a porta.',
      effects: [
        { type: 'mission', id: M02, status: 'completed' },
        { type: 'respect', amount: 3, reason: 'A Cobrança: seu nome começou a circular na Vila' },
        { type: 'setFlag', key: 'miro_met', value: true },
        { type: 'npc', id: 'miro', present: true, spot: 'esquina' },
        { type: 'mission', id: 'A1-M03', status: 'active', stage: 'go_home' }
      ],
      end: true
    }
  ]
};

export const ACT1_SCENES: Scene[] = [INTRO, A1_M01_OFICINA, A1_M01_CASA, A1_M02_COBRANCA];
