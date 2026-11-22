/** Mini games integrados à história. Lógica pura aqui; interface em src/ui/minigame.ts. */
export type MinigameId = 'depoimento' | 'mural' | 'pedidos';
export const MINIGAME_IDS: MinigameId[] = ['depoimento', 'mural', 'pedidos'];

export interface MinigameInfo { title: string; how: string; skipLabel: string }

export const MINIGAME_INFO: Record<MinigameId, MinigameInfo> = {
  depoimento: {
    title: 'O Depoimento',
    how: 'Helena faz perguntas rápidas sobre os últimos dias. Responda com o que você realmente viveu — e sem demorar: hesitação também é uma resposta.',
    skipLabel: 'Responder no automático (resultado médio)'
  },
  mural: {
    title: 'O Mural do Carro Prata',
    how: 'Monte a linha do tempo da sexta-feira tocando nas pistas na ordem em que aconteceram. Depois, aponte a fala que não fecha.',
    skipLabel: 'Deixar a Lia organizar (resultado médio)'
  },
  pedidos: {
    title: 'Pedidos no Balcão',
    how: 'Os fregueses fazem o pedido uma vez só. Guarde na cabeça e sirva na ordem certa, antes que o tempo acabe.',
    skipLabel: 'Fazer o serviço sem pressa (pagamento médio)'
  }
};
