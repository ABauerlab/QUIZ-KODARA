import { env } from '../lib/env'
import type { Msg } from '../quiz/useConversation'
import { MarcaK, Wordmark } from './Logo'

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
}: {
  podeVoltar?: boolean
  onVoltar?: () => void
}) {
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
        {/* O K da logo como foto de contato, com o statusinho verde de "online"
            no canto, igual perfil de contato no WhatsApp/Instagram. */}
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-panel">
            <MarcaK className="h-[19px] w-auto text-white" />
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-[#25D366]"
          />
        </div>
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
