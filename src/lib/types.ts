export type EstagioMarca = 'existente' | 'nova'
export type TecnicaEstampa = 'silk' | 'dtf' | 'indicacao'
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
  cep_destino: string | null
  valor_frete_calculado: number | null
  valor_total_com_frete: number | null
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
