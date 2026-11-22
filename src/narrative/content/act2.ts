/**
 * Ato II — "A Ascensão: A Lei da Rua" (Bíblia Narrativa 1.0, seção 5).
 * A2-M01 "Nome na Rua": um gesto antigo vira reputação pública.
 * A2-M02 "A Voz de Vânia": a mentora propõe uma solução diferente da de Miro.
 * Teste de aceitação da Bíblia: a primeira resposta a Miro muda a primeira fala de Vânia (falas da seção 8).
 * A negociação é abstrata: ninguém fala de valores, rotas ou procedimentos.
 */
import type { Condition, Scene } from '../types';

const resp = (v: string): Condition => ({ flag: 'miro_first_response', eq: v });
const att = (v: string): Condition => ({ flag: 'm05_attitude', eq: v });
const m04 = (v: string): Condition => ({ flag: 'm04_result', eq: v });

/* ------------------------------ A2-M01 ------------------------------ */

export const A2_M01_SOLANGE: Scene = {
  id: 'A2-M01-solange', mission: 'A2-M01', once: true, music: 'theme', title: 'Nome na Rua', location: 'Mercearia da Solange — sábado', start: 'n1',
  nodes: [
    { id: 'n1', speaker: 'narrator', text: 'Dona Solange te vê chegando e baixa o volume do rádio. Duas freguesas param de conversar no mesmo instante.', next: 'n2' },
    { id: 'n2', speaker: 'solange', text: 'Tão falando teu nome por aí, {nome}. Não do jeito de antes.', next: 'n3' },
    {
      id: 'n3', speaker: 'narrator', text: '',
      branch: [{ if: m04('recusou'), next: 'n4r' }, { if: m04('sucesso'), next: 'n4s' }],
      next: 'n4f'
    },
    { id: 'n4r', speaker: 'solange', text: 'Dizem que tu disse não pro Miro, embaixo da passarela, olhando no olho. Ninguém diz não pro Miro.', effects: [{ type: 'setFlag', key: 'gesto', value: 'nao_pro_miro' }], next: 'n5' },
    { id: 'n4s', speaker: 'solange', text: 'Dizem que tu foi no Cais do Norte e voltou inteiro. Tem menino aqui achando isso bonito. Eu não acho.', effects: [{ type: 'setFlag', key: 'gesto', value: 'cais' }], next: 'n5' },
    { id: 'n4f', speaker: 'solange', text: 'Dizem que tu encarou dois homens no Cais e voltou pra contar. Cada um conta de um jeito, e cada vez tu fica maior.', effects: [{ type: 'setFlag', key: 'gesto', value: 'encarou' }], next: 'n5' },
    {
      id: 'n5', speaker: 'solange', text: 'E agora, pra uns, tu virou outra coisa.',
      variants: [
        { if: att('proteger'), text: 'E agora, pra uns, tu virou quem protege a Vila. Gente que nunca falou contigo me pergunta se tu “resolve”.' },
        { if: att('ambicao'), text: 'E agora, pra uns, tu virou o novo braço do Miro. Falam teu nome baixinho, do jeito que falam o dele.' },
        { if: att('ressentimento'), text: 'E agora, pra uns, tu virou quem não abaixa a cabeça. Isso atrai gente. E atrai problema.' }
      ],
      effects: [{ type: 'setFlag', key: 'nome_na_rua', value: true }],
      next: 'n6'
    },
    { id: 'n6', speaker: 'narrator', text: '', branch: [{ if: { flag: 'helena_stance', eq: 'colaborou' }, next: 'n6p' }], next: 'n7' },
    {
      id: 'n6p', speaker: 'solange', text: 'Tem também quem diga que tu conversou com a polícia na porta do bar. Isso aqui gruda, {nome}. Cuidado com quem tu deixa repetir.',
      effects: [{ type: 'setFlag', key: 'rumor_policia', value: true }], next: 'n7'
    },
    { id: 'n7', speaker: 'solange', text: 'Passa no mural da passarela. Tu vai entender.', effects: [{ type: 'stage', mission: 'A2-M01', stage: 'mural' }], end: true }
  ]
};

export const A2_M01_MURAL: Scene = {
  id: 'A2-M01-mural', mission: 'A2-M01', once: true, music: 'theme', title: 'Nome na Rua', location: 'Mural da Passarela', start: 'u1',
  nodes: [
    { id: 'u1', speaker: 'narrator', text: 'No meio dos cartazes de aula de violão e quarto para alugar, alguém escreveu seu nome com pincel atômico. Embaixo, bilhetes dobrados, presos com fita.', next: 'u2' },
    {
      id: 'u2', speaker: 'narrator', style: 'phone', text: 'Bilhetes no mural',
      phone: [
        { from: 'them', who: 'sem nome', time: '', text: '{nome}, meu filho tá sem trabalho faz um ano. vc conhece alguém?' },
        { from: 'them', who: 'Jorge da banca', time: '', text: 'o pessoal do Miro aumentou a “taxa” da banca depois da confusão. não dá.' },
        { from: 'them', who: 'sem nome', time: '', text: 'a briga do 12 com o 14 já virou caso de polícia. alguém tem que falar com eles' }
      ],
      next: 'u3'
    },
    { id: 'u3', speaker: 'narrator', text: 'Ninguém pediu sua opinião para colocar seu nome ali. Mesmo assim, agora ele é público.', next: 'u4' },
    {
      id: 'u4', speaker: 'narrator', text: 'O que você faz com os bilhetes?',
      choices: [
        {
          id: 'arrancar', label: 'Arrancar o nome do mural', say: 'Eu não sou dono de nada aqui. Não sou o Miro.',
          effects: [{ type: 'setFlag', key: 'nome_resposta', value: 'recusou' }, { type: 'trait', trait: 'humanidade', delta: 1 }, { type: 'relation', npc: 'solange', delta: 4 }],
          memory: 'Você arrancou seu nome do mural da passarela.', next: 'u5a'
        },
        {
          id: 'guardar', label: 'Guardar os bilhetes e ler um por um', say: 'Se escreveram pra mim, eu leio. Um por um.',
          effects: [{ type: 'setFlag', key: 'nome_resposta', value: 'assumiu' }, { type: 'trait', trait: 'ambicao', delta: 1 }, { type: 'trait', trait: 'humanidade', delta: 1 }, { type: 'respect', amount: 2, reason: 'Nome na Rua: a Vila começou a procurar você' }],
          memory: 'Você guardou os bilhetes do mural e prometeu ler um por um.', next: 'u5g'
        },
        {
          id: 'miro', label: 'Levar o bilhete da “taxa” para o Miro', say: 'Isso aqui é assunto do Miro. Ele que resolva.',
          effects: [{ type: 'setFlag', key: 'nome_resposta', value: 'miro' }, { type: 'trait', trait: 'lealdade', delta: 1 }, { type: 'relation', npc: 'miro', delta: 6 }],
          memory: 'Você levou o bilhete da banca para Miro.', next: 'u5m'
        }
      ]
    },
    { id: 'u5a', speaker: 'narrator', text: 'Você arranca o papel. No dia seguinte, alguém escreve de novo, menor, num canto.', next: 'u6' },
    { id: 'u5g', speaker: 'narrator', text: 'Os bilhetes pesam no bolso mais do que a caixa do Magrão pesava.', next: 'u6' },
    { id: 'u5m', speaker: 'narrator', text: 'Miro lê o bilhete, amassa e guarda no bolso da jaqueta. Não diz nada. Jorge, da banca, passa a desviar o olhar quando você passa.', effects: [{ type: 'relation', npc: 'solange', delta: -4 }], next: 'u6' },
    {
      id: 'u6', speaker: 'narrator', style: 'phone', text: 'Mensagens',
      phone: [
        { from: 'them', who: 'Miro', time: '19:12', text: 'nome grande na rua chama atenção' },
        { from: 'them', who: 'Miro', time: '19:12', text: 'a minha inclusive' },
        { from: 'them', who: 'Número desconhecido', time: '19:40', text: 'aqui é a Vânia. hoje, 21h, mesa do fundo do bar do Nando.' },
        { from: 'them', who: 'Número desconhecido', time: '19:40', text: 'o Miro sabe. não precisa contar pra ele.' }
      ],
      next: 'u7'
    },
    {
      id: 'u7', speaker: 'narrator', style: 'card', text: 'Sábado, 21h.',
      effects: [
        { type: 'mission', id: 'A2-M01', status: 'completed' },
        { type: 'log', msg: 'Nome na Rua: seu nome apareceu no mural da passarela.' },
        { type: 'clock', label: 'Sábado, 21h', timeOfDay: 'noite' },
        { type: 'npc', id: 'vania', present: true, spot: 'bar_mesa' },
        { type: 'mission', id: 'A2-M02', status: 'active', stage: 'meet_vania' }
      ],
      end: true
    }
  ]
};

/* ------------------------------ A2-M02 ------------------------------ */

export const A2_M02_VANIA: Scene = {
  id: 'A2-M02-vania', mission: 'A2-M02', once: true, music: 'theme', title: 'A Voz de Vânia', location: 'Bar do Nando — mesa do fundo', start: 'v1',
  nodes: [
    { id: 'v1', speaker: 'narrator', text: 'Na mesa do fundo, onde Miro costumava sentar, uma mulher de blazer cinza mexe o gelo de um copo d’água. Ela não se levanta para cumprimentar.', mood: 'tense', next: 'v2' },
    { id: 'v2', speaker: 'vania', text: 'Senta. Eu sou a Vânia.', next: 'v3' },
    {
      // Teste de aceitação da Bíblia: a primeira resposta a Miro muda esta fala.
      id: 'v3', speaker: 'vania', text: 'Miro falou de tu. Pouco, mas falou.',
      variants: [
        { if: resp('negociar'), text: 'Miro disse que tu pediu tempo. Gente que pensa antes de falar às vezes vive mais.' },
        { if: resp('enfrentar'), text: 'Miro não esqueceu da resposta atravessada. Aqui, memória é uma coisa perigosa.' },
        { if: resp('adiar'), text: 'Tu deixou ele acreditar que mandava em tudo. Isso também pode ser uma escolha.' }
      ],
      next: 'v4'
    },
    {
      id: 'v4', speaker: 'vania', text: 'E agora teu nome tá no mural da passarela. Rápido demais.',
      variants: [
        { if: { flag: 'nome_resposta', eq: 'recusou' }, text: 'E tu arrancou teu nome do mural. Escreveram de novo, né? Sempre escrevem.' },
        { if: { flag: 'nome_resposta', eq: 'miro' }, text: 'E tu levou o bilhete da banca pro Miro. Ele gostou. O Jorge, não.' }
      ],
      next: 'v5'
    },
    { id: 'v5', speaker: 'vania', text: 'Vou direto. Os homens do Cais do Norte — os mesmos que pegaram o Nando — querem conversar.', next: 'v6' },
    { id: 'v6', speaker: 'vania', text: 'O Miro quer responder do jeito dele: barulho, recado, gente no hospital. Eu acho que dá pra resolver numa mesa. Sem ninguém machucado.', next: 'v7' },
    {
      id: 'v7', speaker: 'vania', text: 'Amanhã eu sento com o Gaspar, que fala pelo Cais. Tu vem comigo.',
      choices: [
        { id: 'porque', label: 'Por que eu?', say: 'Por que eu? Tu nem me conhece.', next: 'v8a' },
        { id: 'miro_sabe', label: 'O Miro sabe disso?', say: 'E o Miro sabe que tu tá fazendo isso por fora?', next: 'v8b' }
      ]
    },
    { id: 'v8a', speaker: 'vania', text: 'Porque o Miro te odeia um pouco e confia um pouco. Isso é raro. E porque o Gaspar não sabe nada de tu.', next: 'v9' },
    { id: 'v8b', speaker: 'vania', text: 'Vai saber. Por mim, na hora certa. Tu ainda tá aprendendo o que se conta e quando.', next: 'v9' },
    { id: 'v9', speaker: 'vania', text: 'Presta atenção, que eu só falo uma vez. Quem olha o relógio tem pressa: tu espera. Quem repete o mesmo número tá blefando: tu pressiona. Quem fala baixo tá com medo: tu oferece uma saída.', next: 'v10' },
    {
      id: 'v10', speaker: 'narrator', style: 'card', text: 'Domingo, 15h.\nUm galpão neutro no fim da avenida.',
      effects: [{ type: 'clock', label: 'Domingo, 15h', timeOfDay: 'entardecer' }],
      next: 'v11'
    },
    { id: 'v11', speaker: 'narrator', text: 'Gaspar chega sozinho, como combinado. Senta de frente para a porta. Vânia não diz uma palavra: deixa a conversa com você.', next: 'v12' },
    {
      id: 'v12', speaker: 'narrator', text: 'Gaspar apoia os cotovelos na mesa.',
      minigame: { id: 'mesa', key: 'mesa', max: 8, skip: 4, levels: [{ min: 6, value: 'firme' }, { min: 3, value: 'fragil' }, { min: 0, value: 'fracasso' }] },
      next: 'v13'
    },
    {
      id: 'v13', speaker: 'narrator', text: '',
      branch: [{ if: { flag: 'mesa_nivel', eq: 'firme' }, next: 'v14f' }, { if: { flag: 'mesa_nivel', eq: 'fracasso' }, next: 'v14x' }],
      next: 'v14g'
    },
    {
      id: 'v14f', speaker: 'narrator', text: 'Gaspar estende a mão. “Ninguém da Vila perto do galpão, ninguém do Cais perto do bar. Por enquanto.”',
      effects: [
        { type: 'setFlag', key: 'tregua_cais', value: 'firme' },
        { type: 'relation', npc: 'vania', delta: 12, state: 'confianca' },
        { type: 'heat', delta: -5 },
        { type: 'respect', amount: 3, reason: 'A Voz de Vânia: uma trégua com o Cais do Norte sem ninguém machucado' },
        { type: 'log', msg: 'A Mesa: trégua firme com o Cais do Norte.' }
      ],
      next: 'v15f'
    },
    { id: 'v15f', speaker: 'vania', text: 'Na saída: “Tu lê gente. Isso não se ensina — só se lapida.”', next: 'v16' },
    {
      id: 'v14g', speaker: 'narrator', text: 'Gaspar demora a responder. “Duas semanas. Se alguém da Vila pisar no galpão, acabou.”',
      effects: [{ type: 'setFlag', key: 'tregua_cais', value: 'fragil' }, { type: 'relation', npc: 'vania', delta: 4 }, { type: 'log', msg: 'A Mesa: uma trégua frágil, com prazo.' }],
      next: 'v15g'
    },
    { id: 'v15g', speaker: 'vania', text: 'Na saída: “Duas semanas é melhor que nada. E nada é o que o Miro ia conseguir.”', next: 'v16' },
    {
      id: 'v14x', speaker: 'narrator', text: 'Gaspar se levanta antes do café esfriar. “Fala pro Miro que eu tentei.”',
      effects: [{ type: 'setFlag', key: 'tregua_cais', value: 'fracasso' }, { type: 'relation', npc: 'vania', delta: -4 }, { type: 'heat', delta: 5 }, { type: 'log', msg: 'A Mesa: a conversa com o Cais do Norte fracassou.' }],
      next: 'v15x'
    },
    { id: 'v15x', speaker: 'vania', text: 'Na saída: “Hoje o Miro vai dizer que avisou. Deixa ele dizer. Amanhã a gente tenta de novo — de outro jeito.”', next: 'v16' },
    {
      id: 'v16', speaker: 'vania', text: 'Agora tu já viu os dois jeitos: o do Miro e o meu. Um dia vão te perguntar de que lado tu tava.',
      choices: [
        {
          id: 'apoiar', label: 'Ficar do lado da Vânia', say: 'Eu prefiro o teu jeito. Conta comigo.',
          effects: [{ type: 'setFlag', key: 'vania_alliance', value: 'apoio' }, { type: 'relation', npc: 'vania', delta: 10, state: 'confianca' }, { type: 'relation', npc: 'miro', delta: -5 }, { type: 'trait', trait: 'lealdade', delta: 1 }],
          memory: 'Você ficou do lado de Vânia.', next: 'v17a'
        },
        {
          id: 'autonomia', label: 'Seguir o próprio caminho', say: 'Eu não troquei um chefe por outro. Eu escuto os dois e decido.',
          effects: [{ type: 'setFlag', key: 'vania_alliance', value: 'autonomia' }, { type: 'relation', npc: 'vania', delta: 0, state: 'distancia' }, { type: 'trait', trait: 'ambicao', delta: 1 }],
          memory: 'Você disse a Vânia que segue o próprio caminho.', next: 'v17b'
        },
        {
          id: 'contar', label: 'Contar tudo ao Miro', say: 'O Miro precisa saber dessa mesa. Por mim.',
          effects: [{ type: 'setFlag', key: 'vania_alliance', value: 'miro' }, { type: 'relation', npc: 'miro', delta: 8 }, { type: 'relation', npc: 'vania', delta: -10, state: 'conflito' }, { type: 'trait', trait: 'lealdade', delta: 1 }],
          memory: 'Você contou a Miro sobre a mesa com o Cais do Norte.', next: 'v17c'
        }
      ]
    },
    { id: 'v17a', speaker: 'vania', text: 'Não me promete nada. Promessa é o que o Miro coleciona. Me mostra.', next: 'v18' },
    { id: 'v17b', speaker: 'vania', text: 'Bom. Quem não tem dono custa mais caro. E dura menos, se não tomar cuidado.', next: 'v18' },
    { id: 'v17c', speaker: 'vania', text: 'Conta. Ele ia saber de qualquer jeito. Só lembra que fui eu que te levei pra mesa — e não ele.', next: 'v18' },
    {
      id: 'v18', speaker: 'narrator', style: 'card', text: 'A Vila tem dois jeitos de mandar.\nE agora os dois sabem o seu nome.',
      effects: [
        { type: 'mission', id: 'A2-M02', status: 'completed' },
        { type: 'log', msg: 'A Voz de Vânia: você conheceu o outro jeito de mandar na Vila.' },
        { type: 'clock', label: 'Domingo, 19h30', timeOfDay: 'noite' },
        { type: 'mission', id: 'A2-M03', status: 'future' }
      ],
      end: true
    }
  ]
};

export const ACT2_SCENES: Scene[] = [A2_M01_SOLANGE, A2_M01_MURAL, A2_M02_VANIA];
