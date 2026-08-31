/**
 * Motor de precificação por custo + margem, só pra camiseta (o produto foco
 * da Kodara hoje, com ecossistema pronto: modelagem própria, gola em ribana,
 * tecido que não encolhe). As outras peças (moletom, boné, ecobag) continuam
 * usando a tabela de faixa de preço plana em `pricing.ts` até existir uma
 * regra de custo equivalente pra elas.
 *
 * A lógica segue à risca o documento de precificação passado pela Kodara:
 * CUSTO REAL → MARGEM POR FAIXA DE QUANTIDADE → PREÇO → ARREDONDAMENTO
 * COMERCIAL → DESCONTO PIX (com piso de margem mínima).
 *
 * Valores confirmados com a Kodara (não são chute, foram perguntados
 * diretamente): CUSTO_DTF_METRO, LARGURA_DTF_CM e CUSTO_GRAVACAO_TELA.
 */

export const CUSTO_CAMISETA_PADRAO = 40.0
export const CUSTO_CAMISETA_GROSSA = 45.0

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

export interface PrecoCamisetaInput {
  quantidade: number
  tecnica: 'silk' | 'dtf'
  tecido?: string | null
  coresEstampa?: number | null
  estampaLarguraCm?: number | null
  estampaAlturaCm?: number | null
  aplicacoes?: number | null
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
 * Calcula o preço de uma camiseta pelo custo real + margem por faixa de
 * quantidade, seguindo a fórmula PREÇO = CUSTO / (1 - MARGEM), com
 * arredondamento comercial e simulação do desconto Pix respeitando a margem
 * mínima (se o Pix derrubasse a margem abaixo do piso, o desconto não é
 * aplicado — em vez de vender abaixo do combinado).
 */
export function calcularPrecoCamiseta(input: PrecoCamisetaInput): PrecoCamisetaResult {
  const { quantidade, tecnica } = input
  if (!quantidade || quantidade < 1) return SEM_RESULTADO

  const custoBase = custoBaseCamiseta(input.tecido)
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
    const largura = input.estampaLarguraCm
    const altura = input.estampaAlturaCm
    const aplicacoes = input.aplicacoes
    if (!largura || !altura || !aplicacoes) return SEM_RESULTADO
    const dtf = custoDtfPorPeca(largura, altura, aplicacoes)
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
// Confort/Ceramic, Poliamida, Dryfit, Elastano) foi marcado pela Kodara como
// "grossa" ainda — por enquanto todo tecido usa CUSTO_CAMISETA_PADRAO, pra
// não inventar essa diferenciação sem confirmação.
export function custoBaseCamiseta(_tecido?: string | null): number {
  void _tecido
  return CUSTO_CAMISETA_PADRAO
}
