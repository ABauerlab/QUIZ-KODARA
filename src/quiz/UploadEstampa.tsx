import { useRef, useState } from 'react'
import { getSupabase } from '../lib/supabase'

export const BUCKET_ESTAMPAS = 'estampas'
const MAX_BYTES = 15 * 1024 * 1024
const ACCEPT = ['image/png', 'image/jpeg', 'application/pdf']

function extensao(file: File) {
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  return 'jpg'
}

function randomId() {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Sobe o arquivo pro bucket privado e devolve o caminho salvo no lead.
 * O admin gera uma URL assinada na hora de baixar.
 */
export function UploadEstampa({
  onDone,
  onSkip,
}: {
  onDone: (path: string, nomeArquivo: string) => void
  onSkip: () => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<'idle' | 'enviando' | 'erro'>('idle')
  const [erro, setErro] = useState('')

  async function handle(file: File) {
    if (!ACCEPT.includes(file.type)) {
      setStatus('erro')
      setErro('Aceita só PNG, JPG ou PDF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setStatus('erro')
      setErro('Arquivo acima de 15MB. Manda uma versão mais leve ou envia pelo WhatsApp.')
      return
    }
    setStatus('enviando')
    setErro('')
    try {
      const supabase = await getSupabase()
      const path = `${randomId()}.${extensao(file)}`
      const { error } = await supabase.storage.from(BUCKET_ESTAMPAS).upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error
      onDone(path, file.name)
    } catch {
      setStatus('erro')
      setErro('Não rolou subir o arquivo agora. Segue o fluxo e manda pelo WhatsApp.')
    }
  }

  return (
    <div className="grid gap-2">
      <input
        ref={input}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handle(f)
        }}
      />
      <button
        type="button"
        className="btn-primary"
        disabled={status === 'enviando'}
        onClick={() => input.current?.click()}
      >
        {status === 'enviando' ? 'Subindo arquivo...' : 'Escolher arquivo'}
      </button>
      <p className="text-xs text-mute">PNG, JPG ou PDF, até 15MB.</p>
      {erro && <p className="text-xs text-red-400">{erro}</p>}
      <button type="button" className="btn text-center text-mute" onClick={onSkip}>
        Prefiro mandar depois no WhatsApp
      </button>
    </div>
  )
}
