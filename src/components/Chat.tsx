import { useEffect, useRef, useState } from 'react'
import { env } from '../lib/env'
import type { Msg } from '../quiz/useConversation'
import { Wordmark } from './Logo'

export function Bubble({ side, text }: { side: Msg['side']; text: string }) {
  const bot = side === 'bot'
  return (
    <div className={bot ? 'flex justify-start' : 'flex justify-end'}>
      <div
        className={
          'max-w-[85%] animate-pop whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-relaxed ' +
          (bot
            ? 'rounded-bl-md border border-line bg-panel text-white'
            : 'rounded-br-md bg-brand font-medium text-ink')
        }
      >
        {text}
      </div>
    </div>
  )
}

export function Typing() {
  return (
    <div className="flex justify-start" aria-live="polite" aria-label="digitando">
      <div className="flex gap-1 rounded-2xl rounded-bl-md border border-line bg-panel px-4 py-4">
        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-mute" />
        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-mute [animation-delay:.18s]" />
        <i className="h-1.5 w-1.5 animate-blink rounded-full bg-mute [animation-delay:.36s]" />
      </div>
    </div>
  )
}

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-[3px] w-full bg-line" role="progressbar" aria-valuenow={Math.round(pct)}>
      <div
        className="h-full bg-brand transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Header({
  podeVoltar,
  onVoltar,
  podeReiniciar,
  onReiniciar,
  onWhatsapp,
}: {
  podeVoltar?: boolean
  onVoltar?: () => void
  podeReiniciar?: boolean
  onReiniciar?: () => void
  onWhatsapp?: () => void
}) {
  const [menuAberto, setMenuAberto] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha o menu ao clicar fora, igual qualquer menu de app de verdade.
  useEffect(() => {
    if (!menuAberto) return
    function aoClicarFora(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [menuAberto])

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        {/* So ocupa espaco quando existe pra onde voltar, como no WhatsApp. */}
        {podeVoltar && (
          <button
            type="button"
            onClick={onVoltar}
            aria-label="Voltar pra pergunta anterior"
            className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition active:scale-90"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <Wordmark className="h-[21px] w-auto text-white" />
          <p className="mt-1 flex items-center gap-1.5 text-xs">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#25D366] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#25D366]" />
            </span>
            <span className="font-medium text-[#25D366]">online</span>
            <span className="text-mute">· responde rápido</span>
          </p>
        </div>
        {(podeReiniciar || onWhatsapp) && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuAberto((v) => !v)}
              aria-label="Mais opções"
              aria-expanded={menuAberto}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition active:scale-90"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <circle cx="12" cy="5" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="12" cy="19" r="1.8" />
              </svg>
            </button>
            {menuAberto && (
              <div className="absolute right-0 top-full z-20 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-panel shadow-lg">
                {podeReiniciar && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false)
                      onReiniciar?.()
                    }}
                    className="block w-full px-4 py-3 text-left text-sm transition hover:bg-white/5"
                  >
                    ↺ Recomeçar do início
                  </button>
                )}
                {onWhatsapp && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(false)
                      onWhatsapp()
                    }}
                    className="block w-full border-t border-line px-4 py-3 text-left text-sm text-[#25D366] transition hover:bg-white/5"
                  >
                    Falar agora no WhatsApp
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        {env.privacyUrl && (
          <a
            href={env.privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs text-mute underline"
          >
            Privacidade
          </a>
        )}
      </div>
    </header>
  )
}
