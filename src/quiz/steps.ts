import type { Lead } from '../lib/types'

export type StepId =
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'p5'
  | 'p6'
  | 'p7'
  | 'p8'
  | 'p9'
  | 'p10'
  | 'p11'
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
  {
    id: 'p5',
    prompts: ['Sua peça já tem modelagem ou ficha técnica pronta, ou precisa desenvolver com a gente?'],
    counts: true,
  },
  { id: 'p6', prompts: ['Qual cor, ou cores, da peça base?'], counts: true },
  { id: 'p7', prompts: ['Quais tamanhos e quantas peças por tamanho?'], counts: true },
  { id: 'p8', prompts: ['Você já tem uma estampa pronta?'], counts: true },
  { id: 'p9', prompts: ['Onde e de que tamanho vai a estampa?'], counts: true },
  { id: 'p10', prompts: ['Pra quando você precisa que essa produção esteja pronta?'], counts: true },
  {
    id: 'p11',
    prompts: ['Show, já tenho quase tudo. Como posso te chamar, e qual seu WhatsApp?'],
    counts: true,
  },
  { id: 'final', prompts: [], counts: false },
]

/** P4 só existe a partir de 30 peças. */
export function stepIsActive(id: StepId, lead: Lead): boolean {
  if (id === 'p4') return (lead.quantidade ?? 0) >= 30
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

export const ABERTURA = [
  'Fala! Bora estruturar sua marca com a gente',
  'Aqui é o atendimento de Private Label da Kodara. A gente já passou pelo processo inteiro de construir marca própria do zero, então entende cada etapa que você vai viver agora.',
  'Vou te fazer umas perguntas rápidas pra já sair daqui com tudo certo, modelagem, estampa, quantidade e valor. Leva menos de 2 minutos.',
]

export const MSG_MARCA_NOVA =
  'Show, esse é exatamente o público que a gente mais gosta de ajudar. Se quiser um caminho ainda mais completo pra estruturar a marca inteira, a gente também tem o Kit Marca, mas isso é assunto pra depois. Vamos seguir com a peça primeiro.'

export const MSG_DTF_AUTOMATICO =
  'Pra essa quantidade a gente trabalha com DTF, que libera produção a partir de 1 peça. Ótimo pra testar antes de produzir em escala.'

export const MSG_UPLOAD = 'Manda o arquivo aqui que a gente já guarda junto com seu pedido.'

export const MSG_SEM_ARTE =
  'Sem problema, a Kodara também ajuda a criar a estampa do zero. A gente já fez isso com várias marcas.'
