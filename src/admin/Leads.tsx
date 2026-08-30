import { useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatBRL, formatDate, phoneDigits } from '../lib/format'
import { BUCKET_ESTAMPAS } from '../quiz/UploadEstampa'
import { ESTAGIO_LABEL, MODELAGEM_LABEL, TECNICA_LABEL, type Lead } from '../lib/types'

type FiltroEstagio = 'todos' | 'existente' | 'nova'
type FiltroTecnica = 'todas' | 'silk' | 'dtf' | 'indicacao'
type FiltroArte = 'todos' | 'sim' | 'nao'

function Campo({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="border-b border-line py-2 text-sm last:border-0">
      <p className="text-xs uppercase tracking-wide text-mute">{label}</p>
      <p className="mt-0.5 break-words">{value}</p>
    </div>
  )
}

function Detalhe({ lead, supabase }: { lead: Lead; supabase: SupabaseClient }) {
  const [link, setLink] = useState<string | null>(null)
  const [erroLink, setErroLink] = useState('')

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
      <Campo
        label="Modelagem"
        value={lead.modelagem_status ? MODELAGEM_LABEL[lead.modelagem_status] : null}
      />
      <Campo label="Cores" value={lead.cores} />
      <Campo label="Grade" value={grade} />
      <Campo label="Posição da estampa" value={lead.posicao_tamanho_estampa} />
      <Campo label="Prazo" value={lead.prazo_desejado} />
      <Campo label="Arte pronta" value={lead.tem_arte ? 'Sim' : 'Não'} />
      <Campo
        label="Valor estimado"
        value={lead.valor_estimado ? formatBRL(Number(lead.valor_estimado)) : 'Sob consulta'}
      />
      <Campo
        label="Preço unitário aplicado"
        value={lead.preco_unitario ? formatBRL(Number(lead.preco_unitario)) : null}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {lead.whatsapp && (
          <a
            className="rounded-full bg-acid px-4 py-2 text-sm font-semibold text-ink"
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
      </div>
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
        return true
      }),
    [leads, estagio, tecnica, arte],
  )

  if (carregando) return <p className="text-sm text-mute">Carregando leads...</p>
  if (erro) return <p className="text-sm text-red-400">Erro ao carregar: {erro}</p>

  return (
    <div className="grid gap-4">
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
                <p className="font-semibold">{l.nome || 'Sem nome'}</p>
                <p className="text-sm text-mute">
                  {[l.tipo_peca, l.quantidade ? `${l.quantidade} pçs` : null, l.whatsapp]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {l.created_at && <p className="mt-1 text-xs text-mute">{formatDate(l.created_at)}</p>}
              </div>
              <span className="shrink-0 text-sm font-semibold text-acid">
                {l.valor_estimado ? formatBRL(Number(l.valor_estimado)) : 'sob consulta'}
              </span>
            </button>
            {aberto === l.id && <Detalhe lead={l} supabase={supabase} />}
          </div>
        ))}
        {!filtrados.length && <p className="text-sm text-mute">Nenhum lead com esses filtros.</p>}
      </div>
    </div>
  )
}
