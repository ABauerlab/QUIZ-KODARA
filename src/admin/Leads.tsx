import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatBRL, formatDate, phoneDigits } from '../lib/format'
import { BUCKET_ESTAMPAS } from '../quiz/UploadEstampa'
import { ETAPA_LABEL } from '../quiz/steps'
import {
  ESTAGIO_LABEL,
  KIT_MARCA_ITENS,
  STATUS_LABEL,
  TECNICA_LABEL,
  type Lead,
  type LeadStatus,
} from '../lib/types'

export const MSG_RECONTATO =
  'Fala, vi que você começou a montar seu pedido de private label aqui com a gente e não terminou. Ficou alguma dúvida? Bora finalizar juntos.'

type FiltroEstagio = 'todos' | 'existente' | 'nova'
type FiltroTecnica = 'todas' | 'silk' | 'dtf' | 'indicacao'
type FiltroArte = 'todos' | 'sim' | 'nao'
type FiltroStatus = 'todos' | LeadStatus

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="border-b border-line py-2 text-sm last:border-0">
      <p className="text-xs uppercase tracking-wide text-mute">{label}</p>
      <p className="mt-0.5 break-words">{value}</p>
    </div>
  )
}

function Detalhe({
  lead,
  supabase,
  onContatado,
}: {
  lead: Lead
  supabase: SupabaseClient
  onContatado: (id: string) => void
}) {
  const [link, setLink] = useState<string | null>(null)
  const [erroLink, setErroLink] = useState('')
  const [copiado, setCopiado] = useState(false)

  async function gerarLink() {
    if (!lead.arquivo_estampa_url) return
    const { data, error } = await supabase.storage
      .from(BUCKET_ESTAMPAS)
      .createSignedUrl(lead.arquivo_estampa_url, 60 * 10)
    if (error || !data) {
      setErroLink('Não consegui gerar o link agora.')
      return
    }
    setLink(data.signedUrl)
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const grade = lead.grade_tamanhos
    ? Object.entries(lead.grade_tamanhos)
        .map(([t, q]) => `${t}: ${q}`)
        .join(' | ')
    : null

  return (
    <div className="mt-3 rounded-xl border border-line bg-ink p-3">
      <Campo label="Estágio" value={lead.estagio_marca ? ESTAGIO_LABEL[lead.estagio_marca] : null} />
      <Campo label="Peça" value={lead.tipo_peca} />
      <Campo label="Quantidade" value={lead.quantidade} />
      <Campo
        label="Técnica"
        value={
          lead.tecnica_estampa
            ? `${TECNICA_LABEL[lead.tecnica_estampa]}${lead.precisa_orientacao_tecnica ? ' (pediu indicação)' : ''}`
            : null
        }
      />
      <Campo label="Modelagem" value={lead.modelagem} />
      <Campo label="Tecido" value={lead.tecido} />
      <Campo label="Cores" value={lead.cores} />
      <Campo label="Grade" value={grade} />
      <Campo label="Posição da estampa" value={lead.posicao_tamanho_estampa} />
      <Campo
        label="Cores da estampa (silk)"
        value={lead.tecnica_estampa === 'silk' ? lead.cores_estampa : null}
      />
      <Campo
        label="Tamanho da estampa (DTF)"
        value={
          lead.tecnica_estampa === 'dtf' && lead.estampa_largura_cm && lead.estampa_altura_cm
            ? `${lead.estampa_largura_cm}x${lead.estampa_altura_cm}cm${lead.aplicacoes ? `, ${lead.aplicacoes} aplicações` : ''}`
            : null
        }
      />
      <Campo
        label="Kit Marca"
        value={
          lead.kit_marca_itens?.length
            ? lead.kit_marca_itens
                .map((c) => KIT_MARCA_ITENS.find((i) => i.chave === c)?.label ?? c)
                .join(', ')
            : null
        }
      />
      <Campo label="Kit Marca — outros materiais" value={lead.kit_marca_outros} />
      <Campo label="Prazo" value={lead.prazo_desejado} />
      <Campo label="Arte pronta" value={lead.tem_arte ? 'Sim' : 'Não'} />
      <Campo label="CEP de entrega" value={lead.cep_destino} />
      <Campo
        label="Peças"
        value={lead.valor_estimado ? formatBRL(Number(lead.valor_estimado)) : 'Sob consulta'}
      />
      <Campo
        label="Frete"
        value={
          lead.valor_frete_calculado ? formatBRL(Number(lead.valor_frete_calculado)) : 'Não calculado'
        }
      />
      <Campo
        label="Total com frete"
        value={
          lead.valor_total_com_frete ? formatBRL(Number(lead.valor_total_com_frete)) : null
        }
      />
      <Campo
        label="Preço unitário aplicado"
        value={lead.preco_unitario ? formatBRL(Number(lead.preco_unitario)) : null}
      />
      {lead.status === 'incompleto' && (
        <Campo label="Parou em" value={ETAPA_LABEL[lead.etapa_atual ?? ''] ?? lead.etapa_atual} />
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {lead.whatsapp && (
          <a
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-ink"
            href={`https://wa.me/55${phoneDigits(lead.whatsapp)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Chamar no WhatsApp
          </a>
        )}
        {lead.arquivo_estampa_url && (
          <button className="rounded-full border border-line px-4 py-2 text-sm" onClick={gerarLink}>
            {link ? 'Gerar link de novo' : 'Baixar estampa'}
          </button>
        )}
        {lead.status === 'incompleto' && (
          <button
            className="rounded-full border border-line px-4 py-2 text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(MSG_RECONTATO)
                setCopiado(true)
                setTimeout(() => setCopiado(false), 2000)
              } catch {
                setCopiado(false)
              }
            }}
          >
            {copiado ? 'Mensagem copiada!' : 'Copiar mensagem de recontato'}
          </button>
        )}
        {lead.status !== 'contatado' && lead.id && (
          <button
            className="rounded-full border border-line px-4 py-2 text-sm text-mute"
            onClick={() => onContatado(lead.id!)}
          >
            Marcar como contatado
          </button>
        )}
      </div>
      {lead.status === 'incompleto' && (
        <p className="mt-3 rounded-xl border border-line bg-panel p-3 text-xs text-mute">
          {MSG_RECONTATO}
        </p>
      )}
      {erroLink && <p className="mt-2 text-xs text-red-400">{erroLink}</p>}
    </div>
  )
}

export default function Leads({ supabase }: { supabase: SupabaseClient }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)

  const [estagio, setEstagio] = useState<FiltroEstagio>('todos')
  const [tecnica, setTecnica] = useState<FiltroTecnica>('todas')
  const [arte, setArte] = useState<FiltroArte>('todos')
  const [status, setStatus] = useState<FiltroStatus>('todos')

  async function marcarContatado(id: string) {
    const { error } = await supabase.from('leads').update({ status: 'contatado' }).eq('id', id)
    if (error) return
    setLeads((atual) => atual.map((l) => (l.id === id ? { ...l, status: 'contatado' } : l)))
  }

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (cancelado) return
        if (error) setErro(error.message)
        else setLeads((data ?? []) as Lead[])
        setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [supabase])

  const filtrados = useMemo(
    () =>
      leads.filter((l) => {
        if (estagio !== 'todos' && l.estagio_marca !== estagio) return false
        if (tecnica !== 'todas' && l.tecnica_estampa !== tecnica) return false
        if (arte === 'sim' && !l.tem_arte) return false
        if (arte === 'nao' && l.tem_arte) return false
        if (status !== 'todos' && l.status !== status) return false
        return true
      }),
    [leads, estagio, tecnica, arte, status],
  )

  const incompletos = leads.filter((l) => l.status === 'incompleto').length

  if (carregando) return <p className="text-sm text-mute">Carregando leads...</p>
  if (erro) return <p className="text-sm text-red-400">Erro ao carregar: {erro}</p>

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['todos', 'Todos'],
            ['incompleto', `Incompletos${incompletos ? ` (${incompletos})` : ''}`],
            ['completo', 'Terminaram'],
            ['contatado', 'Já contatados'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            onClick={() => setStatus(valor)}
            className={
              'rounded-full px-4 py-2 text-sm transition ' +
              (status === valor ? 'bg-brand font-semibold text-ink' : 'border border-line text-mute')
            }
          >
            {rotulo}
          </button>
        ))}
      </div>

      {status === 'incompleto' && (
        <p className="rounded-2xl border border-line bg-panel p-3 text-xs text-mute">
          Gente que começou e não terminou. Já demonstrou interesse, só precisa de um empurrão. Abre o
          lead pra ver onde parou e copiar a mensagem de recontato.
        </p>
      )}

      <div className="grid gap-3 rounded-2xl border border-line bg-panel p-3 sm:grid-cols-3">
        <label className="grid gap-1 text-xs text-mute">
          Estágio da marca
          <select
            className="field py-2"
            value={estagio}
            onChange={(e) => setEstagio(e.target.value as FiltroEstagio)}
          >
            <option value="todos">Todos</option>
            <option value="existente">Marca já rodando</option>
            <option value="nova">Começando do zero</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-mute">
          Técnica
          <select
            className="field py-2"
            value={tecnica}
            onChange={(e) => setTecnica(e.target.value as FiltroTecnica)}
          >
            <option value="todas">Todas</option>
            <option value="silk">Silk</option>
            <option value="dtf">DTF</option>
            <option value="indicacao">Pediu indicação</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-mute">
          Arte pronta
          <select className="field py-2" value={arte} onChange={(e) => setArte(e.target.value as FiltroArte)}>
            <option value="todos">Todos</option>
            <option value="sim">Com arte</option>
            <option value="nao">Sem arte</option>
          </select>
        </label>
      </div>

      <p className="text-xs text-mute">
        {filtrados.length} de {leads.length} leads
      </p>

      <div className="grid gap-2">
        {filtrados.map((l) => (
          <div key={l.id} className="rounded-2xl border border-line bg-panel p-3">
            <button
              className="flex w-full items-start justify-between gap-3 text-left"
              onClick={() => setAberto(aberto === l.id ? null : (l.id ?? null))}
            >
              <div>
                <p className="font-semibold">
                  {l.nome || 'Sem nome'}
                  {l.status && l.status !== 'completo' && (
                    <span
                      className={
                        'ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-medium ' +
                        (l.status === 'incompleto'
                          ? 'bg-white/10 text-white/80'
                          : 'bg-line text-mute')
                      }
                    >
                      {STATUS_LABEL[l.status]}
                    </span>
                  )}
                </p>
                {l.status === 'incompleto' && (
                  <p className="text-xs text-white/70">
                    Parou em: {ETAPA_LABEL[l.etapa_atual ?? ''] ?? l.etapa_atual ?? 'início'}
                  </p>
                )}
                <p className="text-sm text-mute">
                  {[l.tipo_peca, l.quantidade ? `${l.quantidade} pçs` : null, l.whatsapp]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {l.created_at && <p className="mt-1 text-xs text-mute">{formatDate(l.created_at)}</p>}
              </div>
              <span className="shrink-0 text-sm font-semibold text-brand">
                {l.valor_total_com_frete
                  ? formatBRL(Number(l.valor_total_com_frete))
                  : l.valor_estimado
                    ? formatBRL(Number(l.valor_estimado))
                    : 'sob consulta'}
              </span>
            </button>
            {aberto === l.id && (
              <Detalhe lead={l} supabase={supabase} onContatado={marcarContatado} />
            )}
          </div>
        ))}
        {!filtrados.length && <p className="text-sm text-mute">Nenhum lead com esses filtros.</p>}
      </div>
    </div>
  )
}
