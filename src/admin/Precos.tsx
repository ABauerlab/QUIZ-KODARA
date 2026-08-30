import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { env } from '../lib/env'
import type { PrecoRow } from '../lib/types'

type Draft = Omit<PrecoRow, 'id'> & { id?: string }

const NOVA: Draft = {
  tecnica: 'dtf',
  tipo_peca: '',
  quantidade_min: 1,
  quantidade_max: 29,
  preco_unitario: 0,
  observacao: null,
}

export default function Precos({ supabase }: { supabase: SupabaseClient }) {
  const [rows, setRows] = useState<PrecoRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const [msg, setMsg] = useState('')
  const [nova, setNova] = useState<Draft>(NOVA)

  async function carregar() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('tabela_precos')
      .select('*')
      .order('tipo_peca')
      .order('tecnica')
      .order('quantidade_min')
    if (error) setMsg(error.message)
    else setRows((data ?? []) as PrecoRow[])
    setCarregando(false)
  }

  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  function editar(id: string, campo: keyof PrecoRow, valor: string) {
    setRows((r) =>
      r.map((row) =>
        row.id === id
          ? {
              ...row,
              [campo]:
                campo === 'preco_unitario' || campo === 'quantidade_min' || campo === 'quantidade_max'
                  ? Number(valor.replace(',', '.')) || 0
                  : valor,
            }
          : row,
      ),
    )
  }

  async function salvar(row: PrecoRow) {
    setMsg('')
    const { error } = await supabase
      .from('tabela_precos')
      .update({
        tecnica: row.tecnica,
        tipo_peca: row.tipo_peca,
        quantidade_min: row.quantidade_min,
        quantidade_max: row.quantidade_max,
        preco_unitario: row.preco_unitario,
        observacao: row.observacao,
      })
      .eq('id', row.id)
    setMsg(error ? `Erro ao salvar: ${error.message}` : 'Faixa salva.')
  }

  async function apagar(id: string) {
    if (!window.confirm('Apagar essa faixa de preço?')) return
    const { error } = await supabase.from('tabela_precos').delete().eq('id', id)
    if (error) setMsg(`Erro ao apagar: ${error.message}`)
    else {
      setRows((r) => r.filter((x) => x.id !== id))
      setMsg('Faixa apagada.')
    }
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    if (!nova.tipo_peca.trim()) return
    const { error } = await supabase.from('tabela_precos').insert({ ...nova, id: undefined })
    if (error) setMsg(`Erro ao criar: ${error.message}`)
    else {
      setNova(NOVA)
      setMsg('Faixa criada.')
      void carregar()
    }
  }

  if (carregando) return <p className="text-sm text-mute">Carregando tabela...</p>

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-line bg-panel p-3 text-sm">
        <p className="font-semibold">Chave PIX</p>
        <p className="mt-1 break-all font-mono text-xs text-mute">{env.pixKey || 'não configurada'}</p>
        <p className="mt-2 text-xs text-mute">
          A chave vem da variável VITE_PIX_KEY no arquivo .env. Pra trocar, edite o .env, rode npm run build
          e suba a pasta dist de novo.
        </p>
      </div>

      {msg && <p className="text-sm text-brand">{msg}</p>}

      <div className="grid gap-2">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 rounded-2xl border border-line bg-panel p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <select
                className="field py-2"
                value={row.tecnica}
                onChange={(e) => editar(row.id, 'tecnica', e.target.value)}
              >
                <option value="silk">Silk</option>
                <option value="dtf">DTF</option>
              </select>
              <input
                className="field py-2"
                value={row.tipo_peca}
                placeholder="Peça"
                onChange={(e) => editar(row.id, 'tipo_peca', e.target.value)}
              />
              <input
                className="field py-2"
                inputMode="numeric"
                value={row.quantidade_min}
                onChange={(e) => editar(row.id, 'quantidade_min', e.target.value)}
              />
              <input
                className="field py-2"
                inputMode="numeric"
                value={row.quantidade_max}
                onChange={(e) => editar(row.id, 'quantidade_max', e.target.value)}
              />
              <input
                className="field py-2"
                inputMode="decimal"
                value={row.preco_unitario}
                onChange={(e) => editar(row.id, 'preco_unitario', e.target.value)}
              />
            </div>
            <input
              className="field py-2 text-xs"
              placeholder="Observação (ex: valor de exemplo, trocar pelo real)"
              value={row.observacao ?? ''}
              onChange={(e) => editar(row.id, 'observacao', e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-ink"
                onClick={() => void salvar(row)}
              >
                Salvar
              </button>
              <button
                className="rounded-full border border-line px-4 py-2 text-sm text-mute"
                onClick={() => void apagar(row.id)}
              >
                Apagar
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={criar} className="grid gap-2 rounded-2xl border border-white/15 bg-white/[0.03] p-3">
        <p className="text-sm font-semibold">Nova faixa</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <select
            className="field py-2"
            value={nova.tecnica}
            onChange={(e) => setNova({ ...nova, tecnica: e.target.value as 'silk' | 'dtf' })}
          >
            <option value="silk">Silk</option>
            <option value="dtf">DTF</option>
          </select>
          <input
            className="field py-2"
            placeholder="Peça"
            value={nova.tipo_peca}
            onChange={(e) => setNova({ ...nova, tipo_peca: e.target.value })}
          />
          <input
            className="field py-2"
            inputMode="numeric"
            placeholder="mín"
            value={nova.quantidade_min}
            onChange={(e) => setNova({ ...nova, quantidade_min: Number(e.target.value) || 0 })}
          />
          <input
            className="field py-2"
            inputMode="numeric"
            placeholder="máx"
            value={nova.quantidade_max}
            onChange={(e) => setNova({ ...nova, quantidade_max: Number(e.target.value) || 0 })}
          />
          <input
            className="field py-2"
            inputMode="decimal"
            placeholder="preço"
            value={nova.preco_unitario}
            onChange={(e) => setNova({ ...nova, preco_unitario: Number(e.target.value.replace(',', '.')) || 0 })}
          />
        </div>
        <button className="btn-primary">Adicionar faixa</button>
      </form>
    </div>
  )
}
