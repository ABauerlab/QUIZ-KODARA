import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Quiz from './quiz/Quiz'
import { warmSupabase } from './lib/supabase'

// Roteamento manual de uma linha: o admin e a unica outra rota e sai em outro
// chunk, entao o quiz nao carrega nada do painel.
const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin'
const Admin = lazy(() => import('./admin/Admin'))

const root = createRoot(document.getElementById('root')!)

root.render(
  <StrictMode>
    {isAdmin ? (
      <Suspense fallback={<div className="p-6 text-sm text-mute">Carregando painel...</div>}>
        <Admin />
      </Suspense>
    ) : (
      <Quiz />
    )}
  </StrictMode>,
)

if (!isAdmin) warmSupabase()
