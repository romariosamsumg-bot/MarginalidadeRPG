/**
 * Formato dos dados narrativos. Conteúdo é DADO, nunca código: condições e efeitos
 * pertencem a listas fechadas e são interpretados pelo motor (src/narrative/engine.ts).
 */

export type NpcId = 'magrao' | 'lia' | 'solange' | 'miro' | 'nando' | 'ze' | 'vania';
export type Speaker = NpcId | 'player' | 'narrator' | 'helena';
export type TraitId = 'lealdade' | 'ambicao' | 'humanidade';
export type RelationState = 'neutro' | 'confianca' | 'distancia' | 'conflito' | 'rompimento';
export type StatId = 'astucia' | 'forca' | 'labia' | 'influencia';
export type FlagValue = boolean | string | number;

export type Condition =
  | { flag: string; eq?: FlagValue }          // sem eq: flag "verdadeira" (definida e != false)
  | { notFlag: string }
  | { stat: StatId; gte: number }
  | { respect: number }
  | { mission: string; status: MissionStatus }
  | { stage: string; mission: string }
  | { relation: NpcId; gte?: number; lte?: number }
  | { item: string }
  | { homeCity: string }
  | { energy: number }
  | { timeOfDay: TimeOfDay }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type Effect =
  | { type: 'setFlag'; key: string; value: FlagValue }
  | { type: 'relation'; npc: NpcId; delta: number; state?: RelationState }
  | { type: 'trait'; trait: TraitId; delta: number }
  | { type: 'respect'; amount: number; reason: string }
  | { type: 'mission'; id: string; status: MissionStatus; stage?: string }
  | { type: 'stage'; mission: string; stage: string }
  | { type: 'npc'; id: NpcId; present: boolean; spot?: string }
  | { type: 'clock'; label: string; timeOfDay: TimeOfDay }
  | { type: 'item'; id: string; has: boolean }
  | { type: 'log'; msg: string }
  | { type: 'trigger'; id: string }
  /** Gasta energia (núcleo do RPG). Só valores negativos. */
  | { type: 'energy'; delta: number }
  /** Altera a pressão policial (núcleo do RPG), limitada a 0–100. */
  | { type: 'heat'; delta: number }
  /** Pagamento em dinheiro (somente em cena única; escala da economia legada). */
  | { type: 'cash'; amount: number; reason: string }
  /**
   * Teste de risco abstrato: chance = base + atributo×peso − pressão×0,4 (+ bônus se a flag existir),
   * limitada a 15–90%. Resultado gravado em flags[key] = 'sucesso' | 'falha' e a chance em flags[key + '_chance'].
   */
  | { type: 'check'; key: string; stat: StatId; base: number; weight: number; bonusFlag?: string; bonus?: number };

export const EFFECT_TYPES = ['setFlag', 'relation', 'trait', 'respect', 'mission', 'stage', 'npc', 'clock', 'item', 'log', 'trigger', 'energy', 'heat', 'cash', 'check'] as const;

export type MissionStatus = 'locked' | 'active' | 'completed' | 'future';
export type TimeOfDay = 'entardecer' | 'noite';

export interface TextVariant { if: Condition; text: string }

export interface Choice {
  id: string;
  label: string;
  /** Linha falada pelo protagonista ao escolher (opcional). */
  say?: string;
  requires?: Condition;
  /** Texto mostrado quando o requisito não é atendido. */
  requiresLabel?: string;
  /** Opção só aparece se a condição for verdadeira. */
  showIf?: Condition;
  effects?: Effect[];
  /** Registrada no histórico de escolhas importantes (tela História). */
  memory?: string;
  /** Encerra a cena SEM concluí-la (pode ser retomada depois) — ex.: "agora não". Só com next 'END'. */
  defer?: boolean;
  /** Abre um painel de RPG ao concluir (ponte NPC → sistemas). */
  openPanel?: PanelId;
  /** Abre um mini game avulso ao encerrar a conversa (ex.: bico no balcão). Só com next 'END'. */
  openMinigame?: 'pedidos';
  /** ID do próximo nó, ou 'END' para encerrar a cena. */
  next: string;
}

export type PanelId = 'resumo' | 'historia' | 'missoes' | 'cidade' | 'economia' | 'gangue' | 'temporada' | 'ajustes';

export interface DialogueNode {
  id: string;
  speaker: Speaker;
  text: string;
  variants?: TextVariant[];
  /** Estilo de apresentação. */
  style?: 'line' | 'card' | 'phone';
  /** Ilustração de fundo para style 'card' (chave em src/art/assets.ts#CARD_ART). */
  art?: 'vila' | 'encomenda' | 'oficina_fechada';
  /** Mensagens para style 'phone'. */
  phone?: Array<{ from: 'me' | 'them' | 'system'; who?: string; time: string; text: string }>;
  effects?: Effect[];
  choices?: Choice[];
  /** Redirecionamento automático ao entrar no nó (primeira condição verdadeira). */
  branch?: Array<{ if: Condition; next: string }>;
  next?: string;
  end?: boolean;
  /** Dica de áudio/ambiente para a UI. */
  mood?: 'tense' | 'calm' | 'sad';
  /**
   * Mini game dentro da cena. O nó não avança com toque: o resultado (ou "pular") é enviado
   * por story/minigame e gravado em flags[key] (pontos) e flags[key + '_nivel'] (primeiro nível com min ≤ pontos).
   */
  minigame?: MinigameNode;
}

export interface MinigameNode {
  id: 'depoimento' | 'mural' | 'mesa';
  key: string;
  max: number;
  /** Pontos usados quando o jogador pula (acessibilidade): sempre um resultado intermediário. */
  skip: number;
  /** Em ordem decrescente de min; o último deve ter min 0. */
  levels: Array<{ min: number; value: string }>;
}

export interface Scene {
  id: string;
  /** Missão a que pertence (ou null para conversas do dia a dia). */
  mission: string | null;
  /** Cenas únicas não podem ser rejogadas; efeitos de recompensa só são permitidos nelas. */
  once: boolean;
  title?: string;
  location?: string;
  music?: 'theme' | 'none';
  start: string;
  nodes: DialogueNode[];
}

export interface MissionStage { objective: string; target: string | null; area: 'vila' | 'bar' | 'casa' | null }
export interface MissionDefN {
  id: string; act: number; title: string; summary: string;
  implemented: boolean;
  stages: Record<string, MissionStage>;
}
export interface ActDef { act: number; title: string; theme: string; missions: MissionDefN[] }
