export type EstagioMarca = 'existente' | 'nova'
export type TecnicaEstampa = 'silk' | 'dtf' | 'indicacao'
/** @deprecated Substituído por `modelagem` (catálogo de modelagens prontas). Mantido só pra leads antigos. */
export type ModelagemStatus = 'pronta' | 'desenvolver'
export type LeadStatus = 'incompleto' | 'completo' | 'contatado'

export type GradeTamanhos = Record<string, number>

export interface Lead {
  id?: string
  created_at?: string
  estagio_marca: EstagioMarca | null
  tipo_peca: string | null
  quantidade: number | null
  tecnica_estampa: TecnicaEstampa | null
  precisa_orientacao_tecnica: boolean
  /** @deprecated ver `modelagem`. */
  modelagem_status: ModelagemStatus | null
  /** Modelagem de camiseta escolhida no catálogo pronto da Kodara (ex: "Oversized"), só quando a peça é camiseta. */
  modelagem: string | null
  /** Tecido escolhido (ex: "Penteado", "Dryfit"), só quando a peça é camiseta. */
  tecido: string | null
  /** Quantidade de cores da estampa, usado no cálculo de custo quando a técnica é silk. */
  cores_estampa: number | null
  /** Largura em cm da primeira aplicação de DTF (espelha aplicacoes_detalhe[0], mantido pra leitura rápida). */
  estampa_largura_cm: number | null
  /** Altura em cm da primeira aplicação de DTF (espelha aplicacoes_detalhe[0], mantido pra leitura rápida). */
  estampa_altura_cm: number | null
  /** Quantidade de posições de aplicação (frente, frente+costas, etc.), usado no custo do DTF. */
  aplicacoes: number | null
  /** Uma medida (largura x altura, cm) por aplicação de DTF — cada posição pode ter um tamanho de arte diferente. */
  aplicacoes_detalhe: { largura_cm: number; altura_cm: number }[] | null
  cores: string | null
  grade_tamanhos: GradeTamanhos | null
  tem_arte: boolean | null
  arquivo_estampa_url: string | null
  posicao_tamanho_estampa: string | null
  prazo_desejado: string | null
  nome: string | null
  whatsapp: string | null
  valor_estimado: number | null
  preco_unitario: number | null
  cep_destino: string | null
  valor_frete_calculado: number | null
  valor_total_com_frete: number | null
  /** Cliente escolheu retirar na loja (Praça Sete, BH) em vez de receber por frete. */
  retirada_loja: boolean | null
  /** Itens do Kit Marca escolhidos como upsell na tela final (chaves de KIT_MARCA_ITENS). */
  kit_marca_itens: string[] | null
  /** Texto livre pra quando o cliente quer outro material gráfico fora do catálogo do Kit Marca. */
  kit_marca_outros: string | null
  /** UTM capturado na URL de entrada do quiz, pra saber qual anúncio trouxe o lead. */
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  /** Preenchido pelo banco, não vai no payload de salvamento. */
  session_id?: string
  status?: LeadStatus
  etapa_atual?: string | null
  updated_at?: string
}

export interface PrecoRow {
  id: string
  tecnica: 'silk' | 'dtf'
  tipo_peca: string
  quantidade_min: number
  quantidade_max: number
  preco_unitario: number
  observacao: string | null
}

export const emptyLead: Lead = {
  estagio_marca: null,
  tipo_peca: null,
  quantidade: null,
  tecnica_estampa: null,
  precisa_orientacao_tecnica: false,
  modelagem_status: null,
  modelagem: null,
  tecido: null,
  cores_estampa: null,
  estampa_largura_cm: null,
  estampa_altura_cm: null,
  aplicacoes: null,
  aplicacoes_detalhe: null,
  cores: null,
  grade_tamanhos: null,
  tem_arte: null,
  arquivo_estampa_url: null,
  posicao_tamanho_estampa: null,
  prazo_desejado: null,
  nome: null,
  whatsapp: null,
  valor_estimado: null,
  preco_unitario: null,
  cep_destino: null,
  valor_frete_calculado: null,
  valor_total_com_frete: null,
  retirada_loja: null,
  kit_marca_itens: null,
  kit_marca_outros: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
}

export const TECNICA_LABEL: Record<TecnicaEstampa, string> = {
  silk: 'Silk',
  dtf: 'DTF',
  indicacao: 'A definir com a Kodara',
}

export const MODELAGEM_LABEL: Record<ModelagemStatus, string> = {
  pronta: 'Modelagem pronta',
  desenvolver: 'Desenvolver com a Kodara',
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  incompleto: 'Abandonou no meio',
  completo: 'Terminou o quiz',
  contatado: 'Já contatado',
}

export const ESTAGIO_LABEL: Record<EstagioMarca, string> = {
  existente: 'Marca já rodando',
  nova: 'Começando do zero',
}

/** Modelagens de camiseta já prontas da Kodara. O cliente escolhe, não desenvolve do zero. */
export const MODELAGENS_CAMISA = ['Oversized', 'Babylook', 'Regata', 'Infantil', 'Boxy']

/** Tecidos disponíveis pra camiseta. */
export const TECIDOS_CAMISA = ['Penteado', 'Confort/Ceramic']

export interface KitMarcaItem {
  chave: string
  label: string
  descricao: string
  /** null = depende da quantidade de peças do pedido (ex: ziplock por unidade). */
  preco: number | null
}

/** Catálogo do upsell "Kit Marca", oferecido na tela final. */
export const KIT_MARCA_ITENS: KitMarcaItem[] = [
  { chave: 'adesivo_vinil', label: 'Adesivo vinil (100 un)', descricao: '100 unidades', preco: 169.9 },
  { chave: 'tag', label: 'Tag (50 un)', descricao: '50 unidades', preco: 92.5 },
  { chave: 'sacola', label: 'Sacola estampada (50 un)', descricao: '50 unidades', preco: 150.0 },
  {
    chave: 'cartao_visita',
    label: 'Cartão de visita (1000 un)',
    descricao: '1000 unidades',
    preco: 150.0,
  },
  {
    chave: 'ziplock',
    label: 'Ziplock personalizado',
    descricao: 'R$ 2,00 por unidade, uma pra cada peça do seu pedido',
    preco: null,
  },
]
