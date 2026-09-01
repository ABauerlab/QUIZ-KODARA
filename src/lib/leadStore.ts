import { supabaseConfigured } from './env'
import { getSupabase } from './supabase'
import type { Lead } from './types'

const CHAVE_SESSAO = 'kodara_quiz_session'

function novoId() {
  const c: Crypto = crypto
  if (typeof c.randomUUID === 'function') return c.randomUUID()
  // Fallback pra navegador antigo sem randomUUID: UUID v4 na mão.
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((n) => n.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/**
 * Um id por sessão do navegador. Guardado no sessionStorage pra que um refresh
 * no meio do quiz continue o mesmo lead em vez de criar um registro duplicado.
 */
export function getSessionId(): string {
  try {
    const salvo = sessionStorage.getItem(CHAVE_SESSAO)
    if (salvo) return salvo
    const id = novoId()
    sessionStorage.setItem(CHAVE_SESSAO, id)
    return id
  } catch {
    // Navegação privada ou storage bloqueado: o id vive só em memória.
    return novoId()
  }
}

/** Só os campos que a função do banco aceita. */
function payload(lead: Lead, etapa: string) {
  return {
    estagio_marca: lead.estagio_marca,
    tipo_peca: lead.tipo_peca,
    quantidade: lead.quantidade,
    tecnica_estampa: lead.tecnica_estampa,
    precisa_orientacao_tecnica: lead.precisa_orientacao_tecnica,
    modelagem_status: lead.modelagem_status,
    modelagem: lead.modelagem,
    tecido: lead.tecido,
    cores_estampa: lead.cores_estampa,
    estampa_largura_cm: lead.estampa_largura_cm,
    estampa_altura_cm: lead.estampa_altura_cm,
    aplicacoes: lead.aplicacoes,
    cores: lead.cores,
    grade_tamanhos: lead.grade_tamanhos,
    tem_arte: lead.tem_arte,
    arquivo_estampa_url: lead.arquivo_estampa_url,
    posicao_tamanho_estampa: lead.posicao_tamanho_estampa,
    prazo_desejado: lead.prazo_desejado,
    nome: lead.nome,
    whatsapp: lead.whatsapp,
    valor_estimado: lead.valor_estimado,
    preco_unitario: lead.preco_unitario,
    cep_destino: lead.cep_destino,
    valor_frete_calculado: lead.valor_frete_calculado,
    valor_total_com_frete: lead.valor_total_com_frete,
    kit_marca_itens: lead.kit_marca_itens,
    kit_marca_outros: lead.kit_marca_outros,
    utm_source: lead.utm_source,
    utm_medium: lead.utm_medium,
    utm_campaign: lead.utm_campaign,
    utm_content: lead.utm_content,
    utm_term: lead.utm_term,
    etapa_atual: etapa,
  }
}

// Uma gravação por vez, e a última resposta sempre vence. Se o usuário anda
// rápido, as chamadas do meio são descartadas em vez de enfileiradas.
let emVoo: Promise<void> | null = null
let pendente: { lead: Lead; etapa: string; status: 'incompleto' | 'completo' } | null = null

async function executar(lead: Lead, etapa: string, status: 'incompleto' | 'completo') {
  const supabase = await getSupabase()
  const { error } = await supabase.rpc('salvar_lead', {
    p_session_id: getSessionId(),
    p_dados: payload(lead, etapa),
    p_status: status,
  })
  if (error) throw error
}

/**
 * Salvamento incremental, disparado a cada resposta. Não bloqueia a UI e nunca
 * estoura erro pro usuário: se falhar no meio do quiz, a próxima resposta manda
 * o estado inteiro de novo e conserta sozinho.
 */
export function salvarParcial(lead: Lead, etapa: string) {
  if (!supabaseConfigured) return
  pendente = { lead, etapa, status: 'incompleto' }
  if (emVoo) return

  const rodar = async () => {
    while (pendente) {
      const atual = pendente
      pendente = null
      try {
        await executar(atual.lead, atual.etapa, atual.status)
      } catch {
        // Silencioso de propósito: isso é background, o quiz não para por isso.
      }
    }
    emVoo = null
  }
  emVoo = rodar()
}

/**
 * Gravação final, com status completo. Essa é a única que reporta erro, porque
 * a tela final depende dela pra liberar o botão do WhatsApp.
 */
export async function salvarCompleto(lead: Lead) {
  // Espera a fila do incremental esvaziar pra não sobrescrever o completo.
  pendente = null
  if (emVoo) await emVoo.catch(() => {})
  await executar(lead, 'final', 'completo')
}
