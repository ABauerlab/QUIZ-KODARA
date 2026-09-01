import { normalizePeca } from './normalizeText'

/**
 * Motor de precificação por custo + margem. Cobre toda peça com custo real
 * cadastrado pela Kodara (camiseta, moletom/corta-vento, boné, ecobag);
 * qualquer outra peça sem custo cadastrado continua na tabela de faixa de
 * preço plana em `pricing.ts`, editável no admin.
 *
 * A lógica segue à risca o documento de precificação passado pela Kodara:
 * CUSTO REAL → MARGEM POR FAIXA DE QUANTIDADE → PREÇO → ARREDONDAMENTO
 * COMERCIAL → DESCONTO PIX (com piso de margem mínima).
 *
 * Nenhum custo aqui é chute: todos foram confirmados diretamente com a
 * Kodara (inclusive CUSTO_DTF_METRO, LARGURA_DTF_CM e CUSTO_GRAVACAO_TELA,
 * que o documento original deixava como "configurável").
 */

export const CUSTO_CAMISETA_PADRAO = 40.0
export const CUSTO_CAMISETA_GROSSA = 45.0
export const CUSTO_MOLETOM = 85.0
export const CUSTO_BONE_FIVE_PANEL = 49.9
export const CUSTO_ECOBAG = 50.0

/** Custo base por peça (o "corpo" antes de aplicar técnica de estampa). Só entra aqui o que já foi confirmado com a Kodara. */
const CUSTOS_BASE_POR_PECA: { chave: string; custo: number }[] = [
  { chave: 'camiseta', custo: CUSTO_CAMISETA_PADRAO },
  { chave: 'moletom', custo: CUSTO_MOLETOM },
  { chave: 'bone', custo: CUSTO_BONE_FIVE_PANEL },
  { chave: 'ecobag', custo: CUSTO_ECOBAG },
]

/** null = peça sem custo cadastrado ainda, cai na tabela plana (sob consulta até ter custo real). */
export function custoBasePorTipoPeca(tipoPeca: string | null | undefined): number | null {
  if (!tipoPeca) return null
  const norm = normalizePeca(tipoPeca)
  const match = CUSTOS_BASE_POR_PECA.find((c) => norm.includes(c.chave))
  return match?.custo ?? null
}

export const CUSTO_APLICACAO_DTF = 1.5
/** R$ por metro linear do rolo de DTF. */
export const CUSTO_DTF_METRO = 69.9
/** Largura útil do rolo de DTF, em cm. Arte mais larga que isso precisa dividir. */
export const LARGURA_DTF_CM = 57

export const CUSTO_SILK_PRIMEIRA_COR = 5.5
export const CUSTO_SILK_COR_ADICIONAL = 1.5
/** Custo fixo de gravar uma tela de silk. Uma tela por cor, prática padrão do processo. */
export const CUSTO_GRAVACAO_TELA = 50.0

export const DESCONTO_PIX = 0.03
export const MARGEM_MINIMA = 0.35

/** Margem-alvo por faixa de quantidade: pedido maior dilui custo fixo e ganha escala. */
export function margemPorQuantidade(quantidade: number): number {
  if (quantidade <= 1) return 0.5
  if (quantidade <= 4) return 0.48
  if (quantidade <= 9) return 0.45
  if (quantidade <= 19) return 0.42
  if (quantidade <= 49) return 0.4
  if (quantidade <= 99) return 0.38
  return 0.35
}

/** Custo do silk por peça: primeira cor + cada cor adicional. */
export function custoSilkPorPeca(cores: number): number {
  if (cores <= 1) return CUSTO_SILK_PRIMEIRA_COR
  return CUSTO_SILK_PRIMEIRA_COR + (cores - 1) * CUSTO_SILK_COR_ADICIONAL
}

export interface AlertaProducao {
  tipo: 'arte_maior_que_largura'
  mensagem: string
}

export interface CustoDtfResult {
  custoPorPeca: number
  alerta: AlertaProducao | null
}

/**
 * Custo do DTF por peça: material (só o lado maior da arte consome o rolo,
 * já que a largura é fixa) + aplicações. Se o lado menor da arte não couber
 * na largura útil do rolo, sinaliza pra verificação de produção em vez de
 * assumir que encaixa.
 */
export function custoDtfPorPeca(larguraCm: number, alturaCm: number, aplicacoes: number): CustoDtfResult {
  const menor = Math.min(larguraCm, alturaCm)
  const maior = Math.max(larguraCm, alturaCm)
  const custoPorCm = CUSTO_DTF_METRO / 100
  const custoMaterial = maior * custoPorCm
  const custoAplicacoes = Math.max(1, aplicacoes) * CUSTO_APLICACAO_DTF
  const alerta: AlertaProducao | null =
    menor > LARGURA_DTF_CM
      ? {
          tipo: 'arte_maior_que_largura',
          mensagem: `Estampa de ${larguraCm}x${alturaCm}cm passa da largura útil do DTF (${LARGURA_DTF_CM}cm). Precisa verificar produção/divisão da arte.`,
        }
      : null
  return { custoPorPeca: custoMaterial + custoAplicacoes, alerta }
}

/** R$137,83 → R$139,90. Arredonda pra cima até o próximo múltiplo comercial de 10, terminando em 90. */
export function arredondarComercial(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return valor
  const teto = Math.ceil(valor / 10) * 10
  const candidato = Number((teto - 0.1).toFixed(2))
  return candidato >= valor ? candidato : Number((candidato + 10).toFixed(2))
}

export interface AplicacaoDtf {
  larguraCm: number
  alturaCm: number
}

export interface PrecoPecaInput {
  tipoPeca: string | null | undefined
  quantidade: number
  tecnica: 'silk' | 'dtf'
  coresEstampa?: number | null
  /** Uma entrada por aplicação de DTF — cada posição pode ter um tamanho de arte diferente. */
  aplicacoesDtf?: AplicacaoDtf[] | null
}

/** Soma o custo de material + aplicação de cada posição de DTF, cada uma com seu próprio tamanho. */
export function custoDtfTotalPorPeca(aplicacoes: AplicacaoDtf[]): CustoDtfResult {
  let custoPorPeca = 0
  let alerta: AlertaProducao | null = null
  for (const a of aplicacoes) {
    const r = custoDtfPorPeca(a.larguraCm, a.alturaCm, 1)
    custoPorPeca += r.custoPorPeca
    if (r.alerta && !alerta) alerta = r.alerta
  }
  return { custoPorPeca, alerta }
}

export interface PrecoCamisetaResult {
  /** null = faltou dado necessário pro cálculo (ex: técnica indicação, ou dado técnico não preenchido ainda). */
  precoUnitario: number | null
  precoTotal: number | null
  precoUnitarioPix: number | null
  precoTotalPix: number | null
  custoUnitario: number | null
  margemAplicada: number | null
  alerta: AlertaProducao | null
}

const SEM_RESULTADO: PrecoCamisetaResult = {
  precoUnitario: null,
  precoTotal: null,
  precoUnitarioPix: null,
  precoTotalPix: null,
  custoUnitario: null,
  margemAplicada: null,
  alerta: null,
}

/**
 * Calcula o preço de uma peça pelo custo real (custo base da peça + técnica
 * de estampa) + margem por faixa de quantidade, seguindo a fórmula
 * PREÇO = CUSTO / (1 - MARGEM), com arredondamento comercial e simulação do
 * desconto Pix respeitando a margem mínima (se o Pix derrubasse a margem
 * abaixo do piso, o desconto não é aplicado — em vez de vender abaixo do
 * combinado). Retorna nulo se a peça não tem custo cadastrado ainda: é
 * proibido inventar preço sem saber o custo real.
 */
export function calcularPrecoPeca(input: PrecoPecaInput): PrecoCamisetaResult {
  const { quantidade, tecnica } = input
  if (!quantidade || quantidade < 1) return SEM_RESULTADO

  const custoBase = custoBasePorTipoPeca(input.tipoPeca)
  if (custoBase === null) return SEM_RESULTADO

  let custoAdicionalPorPeca: number
  let custoFixo = 0
  let alerta: AlertaProducao | null = null

  if (tecnica === 'silk') {
    const cores = input.coresEstampa
    if (!cores || cores < 1) return SEM_RESULTADO
    custoAdicionalPorPeca = custoSilkPorPeca(cores)
    // Uma tela por cor: custo fixo do pedido, depois rateado pela quantidade.
    custoFixo = cores * CUSTO_GRAVACAO_TELA
  } else {
    const aplicacoes = input.aplicacoesDtf
    if (!aplicacoes || !aplicacoes.length) return SEM_RESULTADO
    const dtf = custoDtfTotalPorPeca(aplicacoes)
    custoAdicionalPorPeca = dtf.custoPorPeca
    alerta = dtf.alerta
  }

  const custoTotal = quantidade * (custoBase + custoAdicionalPorPeca) + custoFixo
  const custoUnitario = custoTotal / quantidade

  const margem = margemPorQuantidade(quantidade)
  const precoCalculado = custoUnitario / (1 - margem)
  const precoUnitario = arredondarComercial(precoCalculado)

  const precoPixCalculado = Number((precoUnitario * (1 - DESCONTO_PIX)).toFixed(2))
  const margemPix = (precoPixCalculado - custoUnitario) / precoPixCalculado
  // Se o desconto Pix furasse a margem mínima, não aplica: mantém o preço de tabela no Pix.
  const precoUnitarioPix = margemPix >= MARGEM_MINIMA ? precoPixCalculado : precoUnitario

  return {
    precoUnitario,
    precoTotal: Number((precoUnitario * quantidade).toFixed(2)),
    precoUnitarioPix,
    precoTotalPix: Number((precoUnitarioPix * quantidade).toFixed(2)),
    custoUnitario: Number(custoUnitario.toFixed(2)),
    margemAplicada: margem,
    alerta,
  }
}

// CUSTO_CAMISETA_GROSSA fica disponível pro futuro (tecido/gramatura mais
// estruturada), mas nenhum dos tecidos do catálogo atual (Penteado,
// Confort/Ceramic) foi marcado pela Kodara como "grossa" ainda — por
// enquanto toda camiseta usa CUSTO_CAMISETA_PADRAO, pra não inventar essa
// diferenciação sem confirmação.
