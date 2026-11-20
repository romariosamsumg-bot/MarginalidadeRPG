/**
 * Catálogo da campanha "O Preço do Poder" (Bíblia Narrativa 1.0, seção 5).
 * Somente A1-M01 e A1-M02 estão implementadas na v0.1. As demais estão marcadas
 * `implemented: false` e aparecem na interface como "Em produção" — nunca como concluídas.
 */
import type { ActDef } from '../types';

export const CAMPAIGN: ActDef[] = [
  {
    act: 1, title: 'A Queda: Dívida dos Outros', theme: 'Sobrevivência, injustiça, primeiro compromisso.',
    missions: [
      {
        id: 'A1-M01', act: 1, title: 'O Último Favor', implemented: true,
        summary: 'Magrão pede um favor estranho antes de fechar a oficina. No dia seguinte, ninguém sabe dele.',
        stages: {
          talk_magrao: { objective: 'Passe na Oficina 24. Magrão pediu para você ir antes de fechar.', target: 'magrao', area: 'vila' },
          store_package: { objective: 'Volte para casa e guarde a caixa de Magrão.', target: 'casa', area: 'vila' },
          go_home: { objective: 'Volte para casa.', target: 'casa', area: 'vila' }
        }
      },
      {
        id: 'A1-M02', act: 1, title: 'A Cobrança', implemented: true,
        summary: 'No Bar do Nando, Miro Ferrugem põe no seu nome uma conta que não é sua.',
        stages: {
          go_bar: { objective: 'Nando mandou mensagem. Vá ao Bar do Nando.', target: 'bar_porta', area: 'vila' },
          confront: { objective: 'Converse com o homem da mesa do fundo.', target: 'miro', area: 'bar' }
        }
      },
      { id: 'A1-M03', act: 1, title: 'Portas Fechadas', implemented: false, summary: 'Você procura ajuda e encontra medo e limites. Lia e Dona Solange ganham voz.', stages: {} },
      { id: 'A1-M04', act: 1, title: 'O Primeiro Serviço', implemented: false, summary: 'Uma tarefa ambígua e o primeiro contato com a organização.', stages: {} },
      { id: 'A1-M05', act: 1, title: 'Sangue e Dívida', implemented: false, summary: 'Uma crise local e uma acusação injusta fecham o prólogo.', stages: {} }
    ]
  },
  {
    act: 2, title: 'A Ascensão: A Lei da Rua', theme: 'Pertencimento, autoridade, primeiros abusos de poder.',
    missions: [
      { id: 'A2-M01', act: 2, title: 'Nome na Rua', implemented: false, summary: 'Um gesto antigo vira reputação pública.', stages: {} },
      { id: 'A2-M02', act: 2, title: 'A Voz de Vânia', implemented: false, summary: 'Vânia propõe uma solução diferente da de Miro — e lembra da sua primeira resposta a ele.', stages: {} },
      { id: 'A2-M03', act: 2, title: 'A Pessoa Errada', implemented: false, summary: 'Uma ordem de Miro atinge alguém que ajudou você.', stages: {} },
      { id: 'A2-M04', act: 2, title: 'Conselho Fechado', implemented: false, summary: 'Divergências entre lideranças vêm à tona.', stages: {} },
      { id: 'A2-M05', act: 2, title: 'A Queda de Miro', implemented: false, summary: 'Crise de liderança e disputa de legitimidade.', stages: {} }
    ]
  },
  {
    act: 3, title: 'A Expansão: O Brasil É Pequeno', theme: 'Ambição, diferença regional, acordos frágeis.',
    missions: [
      { id: 'A3-M01', act: 3, title: 'Fora de Casa', implemented: false, summary: 'Primeiro contato com lideranças de outras cidades.', stages: {} },
      { id: 'A3-M02', act: 3, title: 'A Palavra Dada', implemented: false, summary: 'Um acordo antigo retorna como cobrança.', stages: {} },
      { id: 'A3-M03', act: 3, title: 'Amigos de Ocasião', implemented: false, summary: 'Rivalidade entre núcleos regionais.', stages: {} },
      { id: 'A3-M04', act: 3, title: 'O Encontro', implemented: false, summary: 'Reunião entre interesses incompatíveis.', stages: {} },
      { id: 'A3-M05', act: 3, title: 'Um Homem Vivo', implemented: false, summary: 'Um indício confiável sobre Magrão.', stages: {} }
    ]
  },
  {
    act: 4, title: 'O Sistema: Os Donos da Caneta', theme: 'Aparência e realidade, mentiras fundadoras.',
    missions: [
      { id: 'A4-M01', act: 4, title: 'A Mesa Limpa', implemented: false, summary: 'Otávio Valença oferece uma aliança conveniente.', stages: {} },
      { id: 'A4-M02', act: 4, title: 'Voz de Dentro', implemented: false, summary: 'Jonas Tranca entra no conflito de sucessão.', stages: {} },
      { id: 'A4-M03', act: 4, title: 'Cara a Cara', implemented: false, summary: 'O reencontro com Magrão.', stages: {} },
      { id: 'A4-M04', act: 4, title: 'A Primeira Mentira', implemented: false, summary: 'Provas mudam o sentido do prólogo.', stages: {} },
      { id: 'A4-M05', act: 4, title: 'A Cadeira Vazia', implemented: false, summary: 'Colapso das alianças existentes.', stages: {} }
    ]
  },
  {
    act: 5, title: 'O Comando: O Trono de Concreto', theme: 'Legitimidade, solidão, herança e responsabilidade.',
    missions: [
      { id: 'A5-M01', act: 5, title: 'Os Que Ficaram', implemented: false, summary: 'Aliados antigos decidem se permanecem.', stages: {} },
      { id: 'A5-M02', act: 5, title: 'Vozes da União', implemented: false, summary: 'Lideranças contestam a sucessão.', stages: {} },
      { id: 'A5-M03', act: 5, title: 'O Acerto de Contas', implemented: false, summary: 'Confronto emocional com a origem da trajetória.', stages: {} },
      { id: 'A5-M04', act: 5, title: 'A Última Reunião', implemented: false, summary: 'A escolha do modelo de comando.', stages: {} },
      { id: 'A5-M05', act: 5, title: 'O Dia Seguinte', implemented: false, summary: 'Epílogo jogável com uma nova crise.', stages: {} }
    ]
  }
];

export const ALL_MISSIONS = CAMPAIGN.flatMap(a => a.missions);
export const missionById = (id: string | null) => ALL_MISSIONS.find(m => m.id === id);

/** Objetivo atual exibido no HUD, derivado do estado (nunca armazenado duplicado). */
export function currentObjective(story: { currentMissionId: string | null; missions: Record<string, { status: string; stage: string | null }> }) {
  const m = missionById(story.currentMissionId);
  if (!m) return null;
  const st = story.missions[m.id];
  if (!m.implemented || st?.status === 'future') {
    return { missionId: m.id, title: m.title, objective: 'Fim do capítulo piloto. Este capítulo chega na v0.2 — enquanto isso, evolua sua carreira na Vila.', target: null, area: null, future: true };
  }
  const stage = st?.stage ? m.stages[st.stage] : undefined;
  if (!stage) return null;
  return { missionId: m.id, title: m.title, objective: stage.objective, target: stage.target, area: stage.area, future: false };
}
