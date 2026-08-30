import { useEffect, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import { supabaseConfigured } from '../lib/env'
import Leads from './Leads'
import Precos from './Precos'

function Login({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha não conferem.')
    setCarregando(false)
  }

  return (
    <form onSubmit={entrar} className="mx-auto grid w-full max-w-sm gap-3 px-4 py-16">
      <h1 className="text-xl font-bold">Painel Kodara</h1>
      <p className="text-sm text-mute">Acesso só pra quem cuida dos leads.</p>
      <input
        className="field"
        type="email"
        placeholder="Email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="field"
        type="password"
        placeholder="Senha"
        autoComplete="current-password"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
      />
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <button className="btn-primary" disabled={carregando || !email || !senha}>
        {carregando ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}

export default function Admin() {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [pronto, setPronto] = useState(false)
  const [aba, setAba] = useState<'leads' | 'precos'>('leads')

  useEffect(() => {
    if (!supabaseConfigured) {
      setPronto(true)
      return
    }
    let unsub: (() => void) | undefined
    getSupabase()
      .then(async (client) => {
        setSupabase(client)
        const { data } = await client.auth.getSession()
        setSession(data.session)
        setPronto(true)
        const sub = client.auth.onAuthStateChange((_e, s) => setSession(s))
        unsub = () => sub.data.subscription.unsubscribe()
      })
      .catch(() => setPronto(true))
    return () => unsub?.()
  }, [])

  if (!supabaseConfigured) {
    return (
      <div className="p-6 text-sm text-mute">
        Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env e refaça o
        build.
      </div>
    )
  }

  if (!pronto || !supabase) return <div className="p-6 text-sm text-mute">Carregando...</div>
  if (!session) return <Login supabase={supabase} />

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Painel Kodara</h1>
          <p className="text-xs text-mute">{session.user.email}</p>
        </div>
        <button
          className="rounded-full border border-line px-4 py-2 text-sm text-mute"
          onClick={() => void supabase.auth.signOut()}
        >
          Sair
        </button>
      </header>

      <nav className="mb-5 flex gap-2">
        {(['leads', 'precos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAba(t)}
            className={
              'rounded-full px-4 py-2 text-sm transition ' +
              (aba === t ? 'bg-acid font-semibold text-ink' : 'border border-line text-mute')
            }
          >
            {t === 'leads' ? 'Leads' : 'Tabela de preços'}
          </button>
        ))}
      </nav>

      {aba === 'leads' ? <Leads supabase={supabase} /> : <Precos supabase={supabase} />}
    </div>
  )
}
