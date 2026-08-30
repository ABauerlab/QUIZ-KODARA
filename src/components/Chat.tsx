import type { Msg } from '../quiz/useConversation'

export function Bubble({ side, text }: { side: Msg['side']; text: string }) {
  const bot = side === 'bot'
  return (
    <div className={bot ? 'flex justify-start' : 'flex justify-end'}>
      <div
        className={
          'max-w-[85%] animate-pop whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-relaxed ' +
          (bot
            ? 'rounded-bl-md border border-line bg-panel text-white'
            : 'rounded-br-md bg-acid font-medium text-ink')
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
        className="h-full bg-acid transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-acid text-[15px] font-black text-ink">
          K
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">Kodara Private Label</p>
          <p className="text-xs text-mute">responde rápido</p>
        </div>
      </div>
    </header>
  )
}
