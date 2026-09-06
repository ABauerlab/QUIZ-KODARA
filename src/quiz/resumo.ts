import { dtfTexto } from '../lib/format'
import { ESTAGIO_LABEL, FINALIDADE_LABEL, TECNICA_LABEL, type Lead } from '../lib/types'

export interface CampoResumo {
  label: string
  value: string | null
}

function gradeTexto(lead: Lead): string | null {
  if (!lead.grade_tamanhos) return null
  const e = Object.entries(lead.grade_tamanhos)
  if (!e.length) return null
  return e.map(([t, q]) => `${t}: ${q}`).join(' | ')
}

/**
 * Fonte única de verdade pra "o que o cliente respondeu": usada tanto no
 * card "Fechando aqui" quanto na mensagem de WhatsApp. Uma pergunta nova
 * some, só precisa entrar aqui — os dois lugares mostram ela automático,
 * sem precisar lembrar de atualizar em dois arquivos.
 */
export function resumoLead(lead: Lead): CampoResumo[] {
  return [
    { label: 'Estágio da marca', value: lead.estagio_marca ? ESTAGIO_LABEL[lead.estagio_marca] : null },
    { label: 'Finalidade', value: lead.finalidade_peca ? FINALIDADE_LABEL[lead.finalidade_peca] : null },
    { label: 'Nome da marca', value: lead.nome_marca_cliente },
    { label: 'Instagram da marca', value: lead.instagram_marca_cliente },
    { label: 'Peça', value: lead.tipo_peca },
    { label: 'Modelagem', value: lead.modelagem },
    { label: 'Tecido', value: lead.tecido },
    { label: 'Quantidade', value: lead.quantidade ? `${lead.quantidade} peças` : null },
    {
      label: 'Técnica',
      value: lead.tecnica_estampa ? TECNICA_LABEL[lead.tecnica_estampa] : null,
    },
    { label: 'Cor da peça', value: lead.cores },
    {
      label: 'Grade',
      value: lead.grade_indefinida ? 'A definir com a Kodara no WhatsApp' : gradeTexto(lead),
    },
    { label: 'Posição da estampa', value: lead.posicao_tamanho_estampa },
    {
      label: 'Cores da estampa',
      value: lead.tecnica_estampa === 'silk' && lead.cores_estampa ? `${lead.cores_estampa}` : null,
    },
    {
      label: 'Tamanho da estampa',
      value:
        lead.tecnica_estampa === 'dtf'
          ? lead.estampa_medida_indefinida
            ? 'A definir com a Kodara no WhatsApp'
            : dtfTexto(lead)
          : null,
    },
    {
      label: 'Arte',
      value:
        lead.tem_arte === null
          ? null
          : lead.tem_arte
            ? 'Já tem o arquivo (envia direto no WhatsApp)'
            : 'Kodara cria a estampa',
    },
    { label: 'Prazo', value: lead.prazo_desejado },
    {
      label: 'Entrega',
      value: lead.retirada_loja ? 'Retirada na loja (Praça Sete, BH)' : lead.cep_destino ? `CEP ${lead.cep_destino}` : null,
    },
  ]
}
