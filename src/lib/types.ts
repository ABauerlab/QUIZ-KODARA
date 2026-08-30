export type EstagioMarca = 'existente' | 'nova'
export type TecnicaEstampa = 'silk' | 'dtf' | 'indicacao'
export type ModelagemStatus = 'pronta' | 'desenvolver'

export type GradeTamanhos = Record<string, number>

export interface Lead {
  id?: string
  created_at?: string
  estagio_marca: EstagioMarca | null
  tipo_peca: string | null
  quantidade: number | null
  tecnica_estampa: TecnicaEstampa | null
  precisa_orientacao_tecnica: boolean
  modelagem_status: ModelagemStatus | null
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

export const ESTAGIO_LABEL: Record<EstagioMarca, string> = {
  existente: 'Marca já rodando',
  nova: 'Começando do zero',
}
