/**
 * Dados de jogo portados LITERALMENTE de Submundo-Brasil-v0.4.html (linhas 113–189).
 * Não altere valores sem teste de caracterização e justificativa em docs/MIGRACAO_V04.md.
 * Única adaptação: textos que citavam "Submundo" foram mantidos neutros.
 */

export const MAXDAY = 30;

export interface MissionDef {
  id: string; name: string; desc: string;
  difficulty: number; cost: number; low: number; high: number;
  heat: number; respect: number; unlock: number;
}
export const MISSIONS: readonly MissionDef[] = [
  { id: 'correria', name: 'Serviço suspeito', desc: 'Uma oportunidade duvidosa para quem está começando.', difficulty: 11, cost: 16, low: 160, high: 320, heat: 7, respect: 2, unlock: 0 },
  { id: 'mercadoria', name: 'Mercadoria desaparecida', desc: 'Um intermediário oferece pagamento por uma missão arriscada.', difficulty: 17, cost: 23, low: 330, high: 600, heat: 10, respect: 3, unlock: 0 },
  { id: 'deposito', name: 'Operação no depósito', desc: 'Um plano maior, com mais recompensa e mais vigilância.', difficulty: 25, cost: 32, low: 590, high: 990, heat: 15, respect: 5, unlock: 15 },
  { id: 'comboio', name: 'Comboio misterioso', desc: 'Uma operação de alto risco na cidade.', difficulty: 35, cost: 40, low: 1050, high: 1840, heat: 19, respect: 8, unlock: 38 },
  { id: 'cofre', name: 'O grande cofre', desc: 'A missão mais difícil da primeira temporada.', difficulty: 46, cost: 52, low: 1900, high: 3300, heat: 27, respect: 13, unlock: 85 }
];

export interface DistrictDef { id: string; name: string; desc: string; risk: number; bonus: number }
export const DISTRICTS: readonly DistrictDef[] = [
  { id: 'centro', name: 'Centro Antigo', desc: 'Comércio intenso e circulação constante de gente.', risk: 0, bonus: 0 },
  { id: 'cais', name: 'Cais do Norte', desc: 'Galpões, armazéns e uma região portuária em transformação.', risk: 5, bonus: 15 },
  { id: 'jardim', name: 'Jardim União', desc: 'Bairro residencial de trabalhadores e pequenos negócios.', risk: -4, bonus: -10 },
  { id: 'industrial', name: 'Distrito Industrial', desc: 'Grandes empresas e patrulhamento reforçado.', risk: 10, bonus: 28 },
  { id: 'vila', name: 'Vila das Palmeiras', desc: 'Ruas movimentadas e comércio de bairro.', risk: -2, bonus: 4 }
];

export interface BusinessDef { id: string; name: string; desc: string; cost: number; net: number; respect: number }
export const BUSINESSES: readonly BusinessDef[] = [
  { id: 'bar', name: 'Bar da Esquina', desc: 'Um ponto de encontro que rende um caixa modesto.', cost: 1250, net: 85, respect: 3 },
  { id: 'oficina', name: 'Oficina de Motos', desc: 'Movimento diário e clientela recorrente.', cost: 2850, net: 190, respect: 6 },
  { id: 'mercado', name: 'Mercadinho 24h', desc: 'Renda regular e operação mais cara.', cost: 5200, net: 320, respect: 10 },
  { id: 'show', name: 'Casa de Shows', desc: 'Maior investimento e retorno da temporada.', cost: 9700, net: 580, respect: 17 }
];

export interface EventDef { title: string; desc: string; reward: number; risk: number }
export const EVENTS: readonly EventDef[] = [
  { title: 'Dia movimentado', desc: 'Comércio aquecido. Recompensas das missões aumentam.', reward: 12, risk: 0 },
  { title: 'Fiscalização reforçada', desc: 'A vigilância está mais forte. O risco de fracassar aumenta.', reward: 0, risk: 10 },
  { title: 'Festival de rua', desc: 'A cidade recebe um grande evento e fica mais agitada.', reward: 9, risk: 4 },
  { title: 'Rotina normal', desc: 'Sem acontecimentos importantes. O jogo segue seu ritmo.', reward: 0, risk: 0 },
  { title: 'Patrulhas reduzidas', desc: 'O movimento está mais tranquilo e os riscos diminuem.', reward: 0, risk: -7 },
  { title: 'Semana de comércio', desc: 'A movimentação econômica favorece oportunidades.', reward: 7, risk: 0 }
];

export type SkillId = 'astucia' | 'forca' | 'labia' | 'influencia';
export interface SkillDef { id: SkillId; name: string; desc: string }
export const SKILLS: readonly SkillDef[] = [
  { id: 'astucia', name: 'Astúcia', desc: 'Melhora as chances de sucesso nas operações.' },
  { id: 'forca', name: 'Força', desc: 'Ajuda em missões que exigem preparo.' },
  { id: 'labia', name: 'Lábia', desc: 'Aumenta sua capacidade de negociação.' },
  { id: 'influencia', name: 'Influência', desc: 'Amplia contatos e oportunidades.' }
];

export type CareerId = 'operador' | 'articulador' | 'empreendedor';
export interface CareerDef { id: CareerId; name: string; desc: string }
export const CAREERS: readonly CareerDef[] = [
  { id: 'operador', name: 'Operador', desc: '+7 pontos na chance de missão. Em compensação, a vigilância sobe 20% mais rápido.' },
  { id: 'articulador', name: 'Articulador', desc: '+30% de influência em ações sociais e +6 pontos na disputa com rivais. Sem bônus nas missões.' },
  { id: 'empreendedor', name: 'Empreendedor', desc: '+20% na renda dos negócios. Em compensação, -6 pontos na chance de missão.' }
];

export type GoalId = 'capital' | 'renome' | 'dominio';
export interface GoalDef { id: GoalId; name: string; desc: string }
export const GOALS: readonly GoalDef[] = [
  { id: 'capital', name: 'Patrimônio', desc: 'Chegar a R$ 15.000 de patrimônio total (caixa, banco e negócios).' },
  { id: 'renome', name: 'Renome', desc: 'Alcançar 135 de respeito e 25 missões concluídas.' },
  { id: 'dominio', name: 'Territórios', desc: 'Liderar 1 distrito e possuir pelo menos 40 de influência em outro.' }
];

export interface NewsChoice {
  label: string; desc: string; cash: number; energy: number;
  influence?: number; respect?: number; money?: number; heat?: number; rival?: number; nextBonus?: number;
}
export interface NewsDef { id: string; name: string; desc: string; choices: readonly NewsChoice[] }
export const NEWS: readonly NewsDef[] = [
  { id: 'feira', name: 'Feira do bairro', desc: 'O comércio local organiza uma feira. Seu apoio pode melhorar seus contatos.', choices: [
    { label: 'Patrocinar a feira', desc: 'R$ 180 · +14 influência · +2 respeito', cash: 180, energy: 0, influence: 14, respect: 2 },
    { label: 'Ajudar na montagem', desc: '25 energia · R$ 90 · +7 influência', cash: 0, energy: 25, influence: 7, money: 90 }] },
  { id: 'fiscalizacao', name: 'Boletim de fiscalização', desc: 'A cidade intensificou a fiscalização. Há diferentes caminhos para reduzir sua exposição.', choices: [
    { label: 'Contratar assessoria jurídica', desc: 'R$ 260 · -24 vigilância', cash: 260, energy: 0, heat: -24 },
    { label: 'Diminuir o ritmo', desc: '18 energia · -12 vigilância', cash: 0, energy: 18, heat: -12 }] },
  { id: 'boatos', name: 'Rumores na vizinhança', desc: 'Um grupo rival espalha boatos. Você pode procurar diálogo ou agir por conta própria.', choices: [
    { label: 'Organizar reunião', desc: 'R$ 160 e 12 energia · +12 influência · rival -8', cash: 160, energy: 12, influence: 12, rival: -8 },
    { label: 'Responder publicamente', desc: '18 energia · +4 respeito · +10 vigilância · rival +6', cash: 0, energy: 18, respect: 4, heat: 10, rival: 6 }] },
  { id: 'festival', name: 'Festival da cidade', desc: 'Um festival movimenta clientes e abre oportunidades para quem conhece a região.', choices: [
    { label: 'Investir em barracas', desc: 'R$ 320 agora · R$ 480 no próximo dia', cash: 320, energy: 0, nextBonus: 480 },
    { label: 'Ajudar na produção', desc: '25 energia · R$ 150 · +6 influência', cash: 0, energy: 25, money: 150, influence: 6 }] },
  { id: 'comercio', name: 'Convite de comerciantes', desc: 'Uma associação comercial pede apoio para reorganizar a região.', choices: [
    { label: 'Apoiar a associação', desc: 'R$ 240 · +10 influência · rival -4', cash: 240, energy: 0, influence: 10, rival: -4 },
    { label: 'Oferecer seu tempo', desc: '20 energia · +6 influência · -5 vigilância', cash: 0, energy: 20, influence: 6, heat: -5 }] }
];

export interface FactionDef {
  id: string; name: string; short: string; desc: string;
  districts: readonly string[]; initialRelation: number; temperament: number;
}
/** Facções fictícias. Cada distrito possui um rival principal, com diplomacia e atrito próprios. */
export const FACTIONS: readonly FactionDef[] = [
  { id: 'esquina', name: 'Círculo da Esquina', short: 'Esquina', desc: 'Um grupo antigo que preza por reputação e acordos de palavra.', districts: ['centro', 'vila'], initialRelation: -10, temperament: 0 },
  { id: 'docas', name: 'Frente dos Armazéns', short: 'Armazéns', desc: 'Organização pragmática ligada aos galpões e ao comércio portuário fictício.', districts: ['cais', 'industrial'], initialRelation: -20, temperament: 10 },
  { id: 'aurora', name: 'Coletivo Aurora', short: 'Aurora', desc: 'Uma rede de intermediários que prefere influência silenciosa ao confronto.', districts: ['jardim'], initialRelation: 0, temperament: -10 }
];

/** Cidades de origem do formulário da v0.4 (todas preservadas). */
export const HOME_CITIES = ['Rio de Janeiro', 'São Paulo', 'Belo Horizonte', 'Salvador', 'Recife', 'Porto Alegre'] as const;
export type HomeCity = (typeof HOME_CITIES)[number];

/** Custos fixos citados nas regras da v0.4. */
export const COSTS = {
  travelCash: 90, travelEnergy: 5,
  gigEnergy: 28, layLowEnergy: 18,
  trainEnergy: 22, trainBase: 280, trainPerLevel: 38,
  contactEnergy: 22, contactCash: 180, disputeEnergy: 33, disputeCash: 320,
  gangFoundCash: 1800, gangFoundRespect: 30,
  upgradeBase: 1200, upgradePerLevel: 900, upgradeMax: 8,
  gangMissionEnergy: 35,
  dialogueEnergy: 14, dialogueCash: 170,
  pactEnergy: 18, pactCash: 400, pactRelation: 35,
  clashEnergy: 32, clashCash: 300,
  recruitCash: 550, recruitEnergy: 18, crewMax: 8,
  rallyCash: 180, rallyEnergy: 12,
  goalBonus: 600, goalChoiceLastDay: 5
} as const;
