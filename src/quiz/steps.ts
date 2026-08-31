import { isCamiseta } from '../lib/pricing'
import type { Lead } from '../lib/types'

export type StepId =
  | 'p1'
  | 'p2'
  | 'p2m'
  | 'p2t'
  | 'p3'
  | 'p4'
  | 'p6'
  | 'p7'
  | 'p8'
  | 'p9'
  | 'p9d'
  | 'p10'
  | 'p11'
  | 'p12'
  | 'final'

export interface StepDef {
  id: StepId
  /** Balões do sistema, na ordem, antes de liberar a resposta. */
  prompts: string[]
  /** Passos que contam na barra de progresso. */
  counts: boolean
}

export const STEPS: StepDef[] = [
  {
    id: 'p1',
    prompts: ['Você já tem uma marca rodando ou tá começando agora?'],
    counts: true,
  },
  { id: 'p2', prompts: ['Que peça você quer produzir?'], counts: true },
  {
    id: 'p2m',
    prompts: [
      'Nossas camisetas já têm modelagem própria, testada e aprovada pela própria Kodara: gola em ribana, tecido que não encolhe, feita por uma marca independente com 5 anos de mercado. Não precisa desenvolver nada do zero, é só escolher a modelagem.',
      'Qual modelagem combina mais com sua marca?',
    ],
    counts: true,
  },
  {
    id: 'p2t',
    prompts: ['E qual tecido você prefere?'],
    counts: true,
  },
  {
    id: 'p3',
    prompts: ['Quantas peças você tá pensando pra essa primeira produção?'],
    counts: true,
  },
  {
    id: 'p4',
    prompts: [
      'Com esse volume você já pode escolher entre os dois processos. Qual faz mais sentido pra você?',
    ],
    counts: true,
  },
  { id: 'p6', prompts: ['Qual cor, ou cores, da peça base?'], counts: true },
  { id: 'p7', prompts: ['Quais tamanhos e quantas peças por tamanho?'], counts: true },
  { id: 'p8', prompts: ['Você já tem uma estampa pronta?'], counts: true },
  { id: 'p9', prompts: ['Onde vai a estampa?'], counts: true },
  { id: 'p9d', prompts: ['Só mais um detalhe técnico da estampa, pra fechar o valor certinho:'], counts: true },
  { id: 'p10', prompts: ['Pra quando você precisa que essa produção esteja pronta?'], counts: true },
  {
    id: 'p11',
    prompts: ['Show, já tenho quase tudo. Como posso te chamar, e qual seu WhatsApp?'],
    counts: true,
  },
  {
    id: 'p12',
    prompts: ['Qual seu CEP pra eu calcular o frete certinho?'],
    counts: true,
  },
  { id: 'final', prompts: [], counts: false },
]

/**
 * P2m/p2t (modelagem e tecido) só existem pra camiseta, que é o produto foco
 * hoje. P4 (técnica) só existe a partir de 20 peças, abaixo disso é sempre
 * DTF automático. P9d (cores/tamanho da estampa) só existe quando a técnica
 * já foi decidida (silk ou dtf), não faz sentido quando o cliente pediu
 * indicação da Kodara.
 */
export function stepIsActive(id: StepId, lead: Lead): boolean {
  if (id === 'p2m' || id === 'p2t') return isCamiseta(lead.tipo_peca)
  if (id === 'p4') return (lead.quantidade ?? 0) >= 20
  if (id === 'p9d') return lead.tecnica_estampa === 'silk' || lead.tecnica_estampa === 'dtf'
  return true
}

/** Aceita 'abertura' porque a tela de entrada nao e um passo do funil. */
export function nextStep(current: StepId | 'abertura', lead: Lead): StepId {
  const i = STEPS.findIndex((s) => s.id === current)
  for (let j = i + 1; j < STEPS.length; j++) {
    if (stepIsActive(STEPS[j].id, lead)) return STEPS[j].id
  }
  return 'final'
}

/** Progresso em passos respondidos sobre passos ativos, pra barra não mentir. */
export function progress(current: StepId | 'abertura', lead: Lead): number {
  if (current === 'abertura') return 0
  const active = STEPS.filter((s) => s.counts && stepIsActive(s.id, lead))
  const idx = active.findIndex((s) => s.id === current)
  if (current === 'final' || idx === -1) return 1
  return idx / active.length
}

/** "Bom dia" até meio-dia, "boa tarde" até 18h, "boa noite" no resto — reforça o atendimento 24/7. */
export function saudacaoPorHorario(hora: number = new Date().getHours()): string {
  if (hora >= 5 && hora < 12) return 'Bom dia!'
  if (hora >= 12 && hora < 18) return 'Boa tarde!'
  return 'Boa noite!'
}

/** Monta a abertura com saudação de acordo com o horário de quem está entrando agora. */
export function aberturaMensagens(hora?: number): string[] {
  return [
    `${saudacaoPorHorario(hora)} Bora estruturar sua marca com a gente`,
    'Aqui é o atendimento de Private Label da Kodara, no ar 24 horas por dia. A gente já passou pelo processo inteiro de construir marca própria do zero, então entende cada etapa que você vai viver agora.',
    'Vou te fazer umas perguntas rápidas pra já sair daqui com tudo certo, modelagem, estampa, quantidade e valor. Leva menos de 2 minutos.',
    'Se quiser referência de peças antes de começar, dá uma olhada no nosso varejo em vistakodara.com.br ou no Instagram @vistakodara.',
  ]
}

export const MSG_MARCA_NOVA =
  'Show, esse é exatamente o público que a gente mais gosta de ajudar. Se quiser um caminho ainda mais completo pra estruturar a marca inteira, a gente também tem o Kit Marca, mas isso é assunto pra depois. Vamos seguir com a peça primeiro.'

export const MSG_DTF_AUTOMATICO =
  'Pra essa quantidade a gente trabalha com DTF, que libera produção a partir de 1 peça. Ótimo pra testar antes de produzir em escala.'

export const MSG_QUALIDADE =
  'Nossas camisetas são usadas e aprovadas pela própria Kodara: gola em ribana, tecido que não encolhe, modelagem própria de uma marca independente com 5 anos de mercado.'

export const MSG_ETIQUETA =
  'Toda peça já sai com etiqueta interna da marca que fechar com a gente. Se quiser etiqueta bordada, é uma etapa à parte, com tiragem mínima de 1000 unidades a calcular.'

/** Rótulo curto de cada etapa, pro painel dizer onde a pessoa parou. */
export const ETAPA_LABEL: Record<string, string> = {
  p1: 'Estágio da marca',
  p2: 'Tipo de peça',
  p2m: 'Modelagem',
  p2t: 'Tecido',
  p3: 'Quantidade',
  p4: 'Técnica de estampa',
  p6: 'Cor da peça',
  p7: 'Grade de tamanhos',
  p8: 'Estampa pronta',
  p9: 'Posição da estampa',
  p9d: 'Detalhe técnico da estampa',
  p10: 'Prazo',
  p11: 'Nome e WhatsApp',
  p12: 'CEP do frete',
  final: 'Chegou no resumo',
}

export const MSG_UPLOAD = 'Manda o arquivo aqui que a gente já guarda junto com seu pedido.'

export const MSG_SEM_ARTE =
  'Sem problema, a Kodara também ajuda a criar a estampa do zero. A gente já fez isso com várias marcas.'
