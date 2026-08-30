import { useEffect, useState } from 'react'
import { Wordmark } from './Logo'

const DURACAO_MS = 1400
const FADE_MS = 380

/**
 * Momento de marca na abertura.
 *
 * Não custa toque nem tempo de funil: a conversa já roda por baixo desde o
 * primeiro render, então o "digitando" da primeira mensagem acontece durante a
 * splash. Quando ela sai, a mensagem já está lá. Um toque em qualquer lugar
 * pula na hora, pra quem tem pressa.
 */
export function Splash({ onFim }: { onFim: () => void }) {
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSaindo(true), DURACAO_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!saindo) return
    const t = setTimeout(onFim, FADE_MS)
    return () => clearTimeout(t)
  }, [saindo, onFim])

  return (
    <div
      onPointerDown={() => setSaindo(true)}
      className={
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-ink px-8 transition-opacity duration-[380ms] ease-out ' +
        (saindo ? 'pointer-events-none opacity-0' : 'opacity-100')
      }
    >
      <Wordmark className="w-[62vw] max-w-[280px] animate-marca text-white" />
      <div className="flex animate-entra items-center gap-3 [animation-delay:.35s]">
        <span className="h-px w-6 bg-line" />
        <p className="text-[11px] uppercase tracking-[0.28em] text-mute">Private Label</p>
        <span className="h-px w-6 bg-line" />
      </div>
    </div>
  )
}
