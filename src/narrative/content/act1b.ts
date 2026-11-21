/**
 * Ato I — fim do prólogo: A1-M03 "Portas Fechadas", A1-M04 "O Primeiro Serviço" e
 * A1-M05 "Sangue e Dívida" (Bíblia Narrativa 1.0, seção 8).
 * Regras editoriais: o serviço é um evento abstrato (sem procedimento real), a violência acontece fora
 * de cena e sem descrição gráfica, e nenhuma escolha bloqueia o jogo — falhas geram consequências.
 */
import type { Condition, Scene } from '../types';

const resp = (v: string): Condition => ({ flag: 'miro_first_response', eq: v });

/* ------------------------------ A1-M03 ------------------------------ */

export const A1_M03_DOMINGO: Scene = {
  id: 'A1-M03-domingo', mission: 'A1-M03', once: true, music: 'theme', title: 'Portas Fechadas', start: 'd1',
  nodes: [
    { id: 'd1', speaker: 'narrator', style: 'card', text: 'Você quase não dorme.\nDomingo, 17h40.', mood: 'sad', next: 'd2' },
    {
      id: 'd2', speaker: 'narrator', text: 'Da porta dá para ouvir a cozinha: uma cadeira arrastando, uma colher batendo na xícara. Lia não foi a lugar nenhum hoje.',
      effects: [
        { type: 'clock', label: 'Domingo, 17h40', timeOfDay: 'entardecer' },
        { type: 'npc', id: 'lia', present: true, spot: 'casa_mesa' },
        { type: 'stage', mission: 'A1-M03', stage: 'talk_lia' }
      ],
      end: true
    }
  ]
};

export const A1_M03_LIA: Scene = {
  id: 'A1-M03-lia', mission: 'A1-M03', once: true, music: 'theme', title: 'Portas Fechadas', location: 'Sua casa — domingo', start: 'l1',
  nodes: [
    { id: 'l1', speaker: 'narrator', text: 'Lia está sentada à mesa com as apostilas fechadas. O café esfriou na xícara.', next: 'l2' },
    {
      id: 'l2', speaker: 'lia', text: 'A Vila inteira já sabe que o Miro foi atrás de tu no bar.',
      variants: [{ if: resp('enfrentar'), text: 'A Vila inteira já sabe que o Miro foi atrás de tu no bar. E que tu respondeu ele na frente de todo mundo.' }],
      next: 'l3'
    },
    { id: 'l3', speaker: 'narrator', text: '', branch: [{ if: { flag: 'lia_package_answer', eq: 'verdade' }, next: 'l4v' }, { if: { flag: 'lia_package_answer', eq: 'desconversou' }, next: 'l4d' }], next: 'l4s' },
    { id: 'l4v', speaker: 'lia', text: 'Tu me contou da caixa. Então agora me conta o resto.', next: 'l5' },
    { id: 'l4d', speaker: 'lia', text: 'E não vem com "coisa do trabalho" de novo. Eu não sou boba.', next: 'l5' },
    { id: 'l4s', speaker: 'lia', text: 'Tu recusou a caixa do Magrão. Então por que é que o Miro tá cobrando de tu?', next: 'l5' },
    {
      id: 'l5', speaker: 'lia', text: 'Eu fiz uma pergunta. Agora eu quero uma resposta.',
      choices: [
        {
          id: 'tudo', label: 'Contar tudo, inclusive a cobrança', say: 'O Miro diz que o Magrão devia e que agora a conta é minha. Eu não sei quanto. Não sei nem se é verdade.',
          effects: [{ type: 'setFlag', key: 'lia_informed', value: true }, { type: 'relation', npc: 'lia', delta: 10, state: 'confianca' }, { type: 'trait', trait: 'humanidade', delta: 1 }],
          memory: 'Você contou tudo a Lia, inclusive a cobrança de Miro.', next: 'l6t'
        },
        {
          id: 'parte', label: 'Contar só uma parte', say: 'O Miro quer saber do Magrão. Só isso. Eu resolvo.',
          effects: [{ type: 'setFlag', key: 'lia_informed', value: 'parcial' }, { type: 'relation', npc: 'lia', delta: 2 }],
          memory: 'Você contou a Lia só metade da história.', next: 'l6p'
        },
        {
          id: 'esconder', label: 'Esconder o conflito', say: 'Não tem nada pra contar, Lia. Esquece isso.',
          effects: [{ type: 'setFlag', key: 'lia_kept_out', value: true }, { type: 'relation', npc: 'lia', delta: -12, state: 'distancia' }, { type: 'trait', trait: 'ambicao', delta: 1 }],
          memory: 'Você escondeu de Lia o que estava acontecendo.', next: 'l6e'
        }
      ]
    },
    { id: 'l6t', speaker: 'lia', text: 'Uma dívida que nem é tua.', next: 'l7t' },
    { id: 'l7t', speaker: 'lia', text: 'Então a gente pensa junto. Eu não vou ficar de fora disso, ouviu? Nem tu vai me deixar de fora.', next: 'l9' },
    { id: 'l6p', speaker: 'lia', text: 'Tu tá me contando metade. Eu conheço tua cara de metade.', next: 'l7p' },
    { id: 'l7p', speaker: 'lia', text: 'Tá. Quando tu quiser contar a outra metade, eu tô aqui. Mas não demora.', next: 'l9' },
    { id: 'l6e', speaker: 'lia', text: 'Tá bom.', next: 'l7e' },
    {
      id: 'l7e', speaker: 'lia', text: 'Eu vou passar uns dias na casa da minha tia. Não é castigo. É que eu não consigo fingir que tá tudo normal.',
      effects: [{ type: 'npc', id: 'lia', present: false, spot: 'casa_mesa' }], next: 'l9'
    },
    {
      id: 'l9', speaker: 'lia', text: 'Vai falar com a Dona Solange. Se alguém viu alguma coisa na sexta, foi ela.',
      variants: [{ if: { flag: 'lia_kept_out' }, text: 'Se tu quer mesmo resolver alguma coisa, vai falar com a Dona Solange. Ela vê tudo daquela mercearia.' }],
      effects: [{ type: 'stage', mission: 'A1-M03', stage: 'talk_solange' }],
      end: true
    }
  ]
};

export const A1_M03_SOLANGE: Scene = {
  id: 'A1-M03-solange', mission: 'A1-M03', once: true, music: 'theme', title: 'Portas Fechadas', location: 'Mercearia da Solange', start: 's1',
  nodes: [
    { id: 's1', speaker: 'narrator', text: 'A mercearia está fechando. Dona Solange conta o troco duas vezes, devagar, sem olhar para a rua.', next: 's2' },
    { id: 's2', speaker: 'solange', text: 'Eu sabia que tu ia aparecer, {nome}.', next: 's3' },
    { id: 's3', speaker: 'solange', text: 'Não posso resolver teu problema. Ninguém aqui pode. Mas posso te dizer o que eu vi.', next: 's4' },
    {
      id: 's4', speaker: 'solange', text: 'Pergunta.',
      choices: [
        { id: 'magrao', label: 'O que a senhora viu na sexta?', say: 'O que a senhora viu na sexta, Dona Solange?', memory: 'Você perguntou a Dona Solange sobre a sexta-feira.', next: 's5' },
        { id: 'miro', label: 'Quem manda no Miro?', say: 'Quem é que manda no Miro?', effects: [{ type: 'setFlag', key: 'knows_miro_answers', value: true }], memory: 'Você perguntou a Dona Solange quem manda em Miro.', next: 's4m' }
      ]
    },
    { id: 's4m', speaker: 'solange', text: 'Ninguém manda no Miro aqui na Vila. Mas ele também presta conta pra alguém. Sempre presta.', next: 's4m2' },
    { id: 's4m2', speaker: 'solange', text: 'E já que tu perguntou do Miro, vou te contar da sexta também.', next: 's5' },
    {
      id: 's5', speaker: 'solange', text: 'Sexta, umas sete da noite, um carro prata parou na frente da oficina. O Magrão saiu correndo pela escadaria do fim da rua. Não era a primeira vez que esse carro aparecia por aqui.',
      effects: [{ type: 'setFlag', key: 'knows_silver_car', value: true }], next: 's6'
    },
    { id: 's6', speaker: 'solange', text: 'A mãe dele vem aqui todo dia perguntar se eu soube de alguma coisa. Eu digo que não. Às vezes é mentira.', next: 's7' },
    { id: 's7', speaker: 'narrator', text: '', branch: [{ if: { flag: 'lia_kept_out' }, next: 's7l' }], next: 's8' },
    { id: 's7l', speaker: 'solange', text: 'E a Lia passou aqui hoje de mala na mão. Disse que vai ficar uns dias fora. Tu sabe o que fez, né?', next: 's8' },
    {
      id: 's8', speaker: 'solange', text: 'Toma cuidado com o que tu promete pros outros. Aqui, palavra vira dívida rápido.',
      choices: [
        {
          id: 'avisar', label: 'Pedir que ela avise se o carro voltar', say: 'Se esse carro aparecer de novo, a senhora me avisa?',
          requires: { stat: 'labia', gte: 6 }, requiresLabel: 'Requer Lábia 6 — treine em Missões › Centro de treinamento',
          effects: [{ type: 'setFlag', key: 'solange_ally', value: true }, { type: 'relation', npc: 'solange', delta: 12, state: 'confianca' }],
          memory: 'Dona Solange prometeu avisar se o carro prata voltar.', next: 's9a'
        },
        { id: 'agradecer', label: 'Agradecer e ir embora', say: 'Obrigado pela verdade, Dona Solange.', effects: [{ type: 'relation', npc: 'solange', delta: 4 }], next: 's9b' }
      ]
    },
    { id: 's9a', speaker: 'solange', text: 'Aviso. Mas não é por tu. É pela mãe do Magrão.', next: 's10' },
    { id: 's9b', speaker: 'solange', text: 'Vai com Deus. E olha onde pisa.', next: 's10' },
    { id: 's10', speaker: 'narrator', text: 'Na volta, o celular vibra. Um número sem nome.', next: 's11' },
    {
      id: 's11', speaker: 'narrator', style: 'phone', text: 'Número desconhecido',
      phone: [
        { from: 'them', who: 'Desconhecido', time: '19:02', text: 'amanhã 21h. no mural da passarela.' },
        { from: 'them', who: 'Desconhecido', time: '19:02', text: 'vem só.' },
        { from: 'them', who: 'Desconhecido', time: '19:03', text: 'M.' }
      ],
      next: 's12'
    },
    {
      id: 's12', speaker: 'narrator', style: 'card', text: 'Segunda-feira, 20h50.',
      effects: [
        { type: 'setFlag', key: 'solange_met', value: true },
        { type: 'mission', id: 'A1-M03', status: 'completed' },
        { type: 'log', msg: 'Portas Fechadas: Dona Solange viu um carro prata na noite em que Magrão sumiu.' },
        { type: 'clock', label: 'Segunda-feira, 20h50', timeOfDay: 'noite' },
        { type: 'npc', id: 'miro', present: true, spot: 'passarela' },
        { type: 'mission', id: 'A1-M04', status: 'active', stage: 'meet' }
      ],
      end: true
    }
  ]
};

/* ------------------------------ A1-M04 ------------------------------ */

export const A1_M04_SERVICO: Scene = {
  id: 'A1-M04-servico', mission: 'A1-M04', once: true, music: 'theme', title: 'O Primeiro Serviço', location: 'Mural da Passarela — segunda, 21h', start: 'v1',
  nodes: [
    { id: 'v1', speaker: 'narrator', text: 'No mural da passarela, o barulho da avenida engole as conversas. Miro está encostado entre os cartazes, mexendo no celular.', next: 'v2', mood: 'tense' },
    {
      id: 'v2', speaker: 'miro', text: 'Pontual. Gosto disso.',
      variants: [{ if: resp('enfrentar'), text: 'Veio. Achei que tu ia mandar recado atravessado de novo.' }, { if: resp('adiar'), text: 'O "amanhã" chegou. Viu como passa rápido?' }],
      next: 'v3'
    },
    {
      id: 'v3', speaker: 'miro', text: 'Teu amigo deixou um buraco. Tu vai ajudar a tapar. Um serviço, e depois a gente conversa sobre o resto.',
      choices: [
        { id: 'ouvir', label: 'Ouvir a proposta', next: 'v4' },
        { id: 'depois', label: 'Agora não, Miro', say: 'Agora não. Me dá uma hora.', defer: true, next: 'END' }
      ]
    },
    { id: 'v4', speaker: 'player', text: 'Que serviço?', next: 'v5' },
    { id: 'v5', speaker: 'miro', text: 'Tem um galpão no Cais do Norte. Um rapaz chamado Tiquinho vai te entregar uma mochila. Tu traz até aqui. Sem abrir. Sem conversar com ninguém no caminho.', next: 'v6' },
    {
      id: 'v6', speaker: 'narrator', text: 'Uma mochila fechada que não é sua. Exatamente como a caixa do Magrão.',
      variants: [{ if: { flag: 'refused_package' }, text: 'Uma mochila fechada que não é sua. Você recusou a caixa do Magrão na sexta. Agora estão te oferecendo outra.' }],
      choices: [
        {
          id: 'fazer', label: 'Fazer o serviço', say: 'Tá. Eu vou.',
          requires: { energy: 25 }, requiresLabel: 'Requer 25 de energia — descanse no sofá de casa',
          effects: [{ type: 'trait', trait: 'lealdade', delta: 1 }], memory: 'Você aceitou fazer o serviço de Miro.', next: 'v7'
        },
        {
          id: 'negociar', label: 'Negociar os termos', say: 'Eu faço. Mas aí a conta do Magrão fica zerada.',
          requires: { all: [{ stat: 'labia', gte: 6 }, { energy: 25 }] }, requiresLabel: 'Requer Lábia 6 e 25 de energia',
          effects: [{ type: 'setFlag', key: 'm04_terms', value: true }, { type: 'trait', trait: 'ambicao', delta: 1 }],
          memory: 'Você negociou com Miro: um serviço para zerar a conta de Magrão.', next: 'v6n'
        },
        {
          id: 'recusar', label: 'Recusar', say: 'Não vou carregar coisa dos outros. Já perdi um amigo assim.',
          effects: [{ type: 'setFlag', key: 'm04_result', value: 'recusou' }, { type: 'relation', npc: 'miro', delta: -15, state: 'conflito' }, { type: 'heat', delta: 5 }, { type: 'trait', trait: 'humanidade', delta: 1 }],
          memory: 'Você recusou o serviço de Miro.', next: 'v6r'
        }
      ]
    },
    { id: 'v6n', speaker: 'miro', text: 'Tu não tá em posição de negociar nada…', next: 'v6n2' },
    { id: 'v6n2', speaker: 'miro', text: 'Tá. Um serviço bem feito e a gente fecha esse capítulo. Por enquanto.', next: 'v7' },
    {
      id: 'v7', speaker: 'narrator', style: 'card', text: 'Cais do Norte.\nGalpões fechados, um cachorro latindo, uma luz piscando no fim da rua.',
      effects: [
        { type: 'energy', delta: -25 },
        { type: 'check', key: 'm04_result', stat: 'astucia', base: 50, weight: 3.5, bonusFlag: 'm04_terms', bonus: 8 }
      ],
      next: 'v8'
    },
    { id: 'v8', speaker: 'narrator', text: '', branch: [{ if: { flag: 'm04_result', eq: 'sucesso' }, next: 'v9s' }], next: 'v9f' },
    {
      id: 'v9s', speaker: 'narrator', text: 'Tiquinho entrega a mochila sem dizer uma palavra. No caminho de volta, uma viatura passa devagar. Ninguém para você. A mochila pesa mais do que deveria.',
      effects: [{ type: 'heat', delta: 6 }, { type: 'relation', npc: 'miro', delta: 10 }, { type: 'respect', amount: 3, reason: 'O Primeiro Serviço: Miro passou a contar com você' }],
      next: 'v10s'
    },
    {
      id: 'v10s', speaker: 'miro', text: 'Viu? Simples. Toma, pelo incômodo.',
      choices: [
        { id: 'aceitar', label: 'Aceitar o dinheiro', effects: [{ type: 'cash', amount: 300, reason: 'Pagamento de Miro pelo serviço' }, { type: 'trait', trait: 'ambicao', delta: 1 }], memory: 'Você aceitou dinheiro de Miro.', next: 'v12' },
        { id: 'devolver', label: 'Recusar o dinheiro', say: 'Não quero teu dinheiro. Quero minha vida de volta.', effects: [{ type: 'relation', npc: 'miro', delta: -2 }, { type: 'trait', trait: 'humanidade', delta: 1 }], memory: 'Você recusou o dinheiro de Miro.', next: 'v11d' }
      ]
    },
    { id: 'v11d', speaker: 'miro', text: 'Orgulho não paga conta. Mas tudo bem. Eu anoto.', next: 'v12' },
    {
      id: 'v9f', speaker: 'narrator', text: 'Tiquinho não aparece. No lugar dele, dois homens que você nunca viu perguntam quem te mandou. Você sai dali sem a mochila e sem olhar pra trás.',
      effects: [{ type: 'heat', delta: 12 }, { type: 'relation', npc: 'miro', delta: -5 }],
      next: 'v10f'
    },
    { id: 'v10f', speaker: 'miro', text: 'Tu voltou sem nada.', next: 'v11f' },
    { id: 'v11f', speaker: 'miro', text: 'Isso entra na conta. A conta só cresce, {nome}.', next: 'v12' },
    { id: 'v6r', speaker: 'miro', text: 'Então a conta continua aberta. E conta aberta cresce.', next: 'v7r' },
    { id: 'v7r', speaker: 'miro', text: 'Vai pra casa. Mas olha bem o teu portão amanhã.', next: 'v12' },
    { id: 'v12', speaker: 'miro', text: 'Tem gente que quer te conhecer. Vânia Cinza. Ela fala bonito. Não confia de cara.', effects: [{ type: 'setFlag', key: 'vania_mentioned', value: true }], next: 'v13' },
    {
      id: 'v13', speaker: 'narrator', style: 'card', text: 'Terça-feira, 22h10.',
      effects: [
        { type: 'mission', id: 'A1-M04', status: 'completed' },
        { type: 'log', msg: 'O Primeiro Serviço: a primeira conta com Miro foi acertada — ou não.' },
        { type: 'clock', label: 'Terça-feira, 22h10', timeOfDay: 'noite' },
        { type: 'npc', id: 'miro', present: true, spot: 'esquina' },
        { type: 'npc', id: 'nando', present: false, spot: 'balcao' }
      ],
      next: 'v14'
    },
    {
      id: 'v14', speaker: 'narrator', style: 'phone', text: 'Dona Solange',
      phone: [
        { from: 'them', who: 'Dona Solange', time: '22:04', text: 'bateram no nando quando ele fechava o bar' },
        { from: 'them', who: 'Dona Solange', time: '22:04', text: 'ele ta no hospital. vai ficar bem' },
        { from: 'them', who: 'Dona Solange', time: '22:05', text: 'tao falando teu nome. a policia ta la. vem' }
      ],
      effects: [{ type: 'mission', id: 'A1-M05', status: 'active', stage: 'go_bar' }],
      end: true
    }
  ]
};

/* ------------------------------ A1-M05 ------------------------------ */

export const A1_M05_CRISE: Scene = {
  id: 'A1-M05-crise', mission: 'A1-M05', once: true, music: 'theme', title: 'Sangue e Dívida', location: 'Bar do Nando — terça, 22h20', start: 'c1',
  nodes: [
    { id: 'c1', speaker: 'narrator', text: 'O bar está com a porta meio aberta e as cadeiras fora do lugar. Lá fora, uma viatura pinta a calçada de azul e vermelho.', mood: 'tense', next: 'c2' },
    { id: 'c2', speaker: 'narrator', text: 'Seu Zé está sentado sozinho, com um copo vazio. Atrás do balcão não tem ninguém.', next: 'c3' },
    { id: 'c3', speaker: 'ze', text: 'Levaram o Nando pro hospital. Pegaram ele quando fechava. Ele vai ficar bem. Acho.', next: 'c4' },
    { id: 'c4', speaker: 'ze', text: 'E tão dizendo por aí que foi por tua causa. Que o Nando deu teu nome pra quem não devia.', next: 'c5' },
    { id: 'c5', speaker: 'narrator', text: 'Uma mulher de casaco escuro se aproxima com um caderno na mão.', next: 'c6' },
    { id: 'c6', speaker: 'helena', text: 'Helena Paiva, Polícia Civil. Você é {nome}, não é? Seu nome apareceu três vezes hoje.', next: 'c7' },
    {
      id: 'c7', speaker: 'helena', text: 'Não estou te acusando de nada. Ainda. Onde você estava ontem de madrugada?',
      choices: [
        {
          id: 'verdade', label: 'Falar a verdade sobre onde estava', say: 'Em casa. Dormindo. Pode perguntar pra quem quiser.',
          effects: [{ type: 'setFlag', key: 'helena_stance', value: 'colaborou' }, { type: 'heat', delta: -10 }, { type: 'trait', trait: 'humanidade', delta: 1 }],
          memory: 'Você colaborou com a investigadora Helena Paiva.', next: 'c8v'
        },
        {
          id: 'silencio', label: 'Ficar em silêncio', say: '…',
          effects: [{ type: 'setFlag', key: 'helena_stance', value: 'silencio' }, { type: 'heat', delta: 8 }, { type: 'trait', trait: 'lealdade', delta: 1 }],
          memory: 'Você ficou em silêncio diante da investigadora.', next: 'c8s'
        },
        {
          id: 'carro', label: 'Perguntar sobre o carro prata', say: 'A senhora já ouviu falar de um carro prata que anda rondando a Vila?',
          showIf: { flag: 'knows_silver_car' },
          effects: [{ type: 'setFlag', key: 'helena_stance', value: 'carro' }, { type: 'setFlag', key: 'helena_car', value: true }],
          memory: 'Você contou à investigadora sobre o carro prata.', next: 'c8c'
        }
      ]
    },
    { id: 'c8v', speaker: 'helena', text: 'Ótimo. Gente que fala a verdade facilita o meu trabalho. E às vezes a própria vida.', next: 'c9' },
    { id: 'c8s', speaker: 'helena', text: 'Direito seu. Mas silêncio também é uma resposta.', next: 'c9' },
    { id: 'c8c', speaker: 'helena', text: 'Onde você ouviu falar desse carro?', next: 'c8c2' },
    { id: 'c8c2', speaker: 'helena', text: 'Não responde. Eu sei como a Vila funciona. Só te digo uma coisa: eu também estou procurando esse carro.', next: 'c9' },
    { id: 'c9', speaker: 'helena', text: 'Fica na Vila. Não some. Eu vou voltar a te procurar.', next: 'c10' },
    {
      id: 'c10', speaker: 'narrator', text: 'Ela sai. A viatura vai embora devagar. Do outro lado da rua, encostado no muro, alguém está esperando você.',
      effects: [{ type: 'stage', mission: 'A1-M05', stage: 'meet_miro' }],
      end: true
    }
  ]
};

export const A1_M05_OFERTA: Scene = {
  id: 'A1-M05-oferta', mission: 'A1-M05', once: true, music: 'theme', title: 'Sangue e Dívida', location: 'Esquina do bar — terça, 22h40', start: 'o1',
  nodes: [
    { id: 'o1', speaker: 'narrator', text: 'Miro não diz oi. Olha a rua vazia, depois olha para você.', mood: 'tense', next: 'o2' },
    { id: 'o2', speaker: 'miro', text: 'Viu como é rápido? Um dia tu é só mais um. No outro, teu nome tá na boca da polícia e de gente bem pior.', next: 'o3' },
    {
      id: 'o3', speaker: 'narrator', text: '',
      branch: [
        { if: { flag: 'm04_result', eq: 'recusou' }, next: 'o4r' },
        { if: { flag: 'm04_result', eq: 'falha' }, next: 'o4f' }
      ],
      next: 'o4s'
    },
    { id: 'o4r', speaker: 'miro', text: 'Tu recusou o serviço. Olha no que deu. Quem fica fora de tudo é o primeiro a levar a culpa.', next: 'o5' },
    { id: 'o4f', speaker: 'miro', text: 'E tu ainda me deve o serviço que deu errado. Aqueles dois homens do Cais? Eles lembram da tua cara.', next: 'o5' },
    { id: 'o4s', speaker: 'miro', text: 'Tu fez tua parte no Cais. Isso conta. Por isso eu tô aqui conversando, e não mandando recado.', next: 'o5' },
    { id: 'o5', speaker: 'miro', text: 'Eu não encostei no Nando. Mas sei quem encostou. E sei que eles vão voltar.', next: 'o6' },
    { id: 'o6', speaker: 'miro', text: 'Tem um jeito de ninguém mais encostar em tu, nem na tua família. Vem pro meu lado. Oficialmente.', next: 'o7' },
    { id: 'o7', speaker: 'player', text: 'E se eu disser não?', next: 'o8' },
    {
      id: 'o8', speaker: 'miro', text: 'Aí tu fica sem ninguém no meio da rua. E a rua, {nome}, não perdoa quem fica no meio.',
      choices: [
        {
          id: 'ressentimento', label: 'Aceitar, com raiva', say: 'Eu entro. Mas não esquece: foi tu que me empurrou.',
          effects: [{ type: 'setFlag', key: 'm05_attitude', value: 'ressentimento' }, { type: 'relation', npc: 'miro', delta: -5, state: 'conflito' }, { type: 'trait', trait: 'lealdade', delta: 1 }],
          memory: 'Você entrou para o grupo de Miro com ressentimento.', next: 'o9r'
        },
        {
          id: 'proteger', label: 'Aceitar para proteger os seus', say: 'Eu entro. Pela Lia, pelo Nando, pela Vila. Não por tu.',
          effects: [{ type: 'setFlag', key: 'm05_attitude', value: 'proteger' }, { type: 'trait', trait: 'humanidade', delta: 2 }],
          memory: 'Você entrou para o grupo de Miro para proteger quem ama.', next: 'o9p'
        },
        {
          id: 'ambicao', label: 'Aceitar de olho no futuro', say: 'Eu entro. E um dia a gente conversa de igual pra igual.',
          effects: [{ type: 'setFlag', key: 'm05_attitude', value: 'ambicao' }, { type: 'relation', npc: 'miro', delta: 10, state: 'distancia' }, { type: 'trait', trait: 'ambicao', delta: 2 }],
          memory: 'Você entrou para o grupo de Miro de olho no futuro.', next: 'o9a'
        }
      ]
    },
    { id: 'o9r', speaker: 'miro', text: 'Pode me odiar à vontade. Só chega na hora.', next: 'o10' },
    { id: 'o9p', speaker: 'miro', text: 'Proteger os outros é bonito. Só não esquece quem tá protegendo tu.', next: 'o10' },
    { id: 'o9a', speaker: 'miro', text: 'Gostei. Mas cuidado com o que tu deseja. Tem fila, e tu tá no fim dela.', next: 'o10' },
    { id: 'o10', speaker: 'miro', text: 'Bem-vindo à União da Linha.', next: 'o11' },
    {
      id: 'o11', speaker: 'narrator', style: 'card', text: 'Fim do Ato I — A Queda.\nO preço do poder começa a ser cobrado.',
      effects: [
        { type: 'mission', id: 'A1-M05', status: 'completed' },
        { type: 'respect', amount: 5, reason: 'Sangue e Dívida: a Vila sabe que você agora é da União da Linha' },
        { type: 'setFlag', key: 'act1_done', value: true },
        { type: 'log', msg: 'Fim do Ato I: você entrou para a União da Linha.' },
        { type: 'npc', id: 'nando', present: true, spot: 'balcao' },
        { type: 'npc', id: 'lia', present: true, spot: 'casa_mesa' },
        { type: 'mission', id: 'A2-M01', status: 'future' }
      ],
      end: true
    }
  ]
};

export const ACT1B_SCENES: Scene[] = [A1_M03_DOMINGO, A1_M03_LIA, A1_M03_SOLANGE, A1_M04_SERVICO, A1_M05_CRISE, A1_M05_OFERTA];
