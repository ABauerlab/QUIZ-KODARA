import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Bubble, Header, Progress, Typing } from '../components/Chat'
import { pixel } from '../lib/pixel'
import { calcularPreco, fetchTabelaPrecos } from '../lib/pricing'
import { emptyLead, type Lead, type PrecoRow } from '../lib/types'
import * as A from './Answers'
import { UploadEstampa } from './UploadEstampa'
import { useConversation } from './useConversation'
import {
  ABERTURA,
  MSG_MARCA_NOVA,
  MSG_SEM_ARTE,
  MSG_UPLOAD,
  STEPS,
  nextStep,
  progress,
  type StepId,
} from './steps'

const Final = lazy(() => import('./Final'))

type Current = 'abertura' | StepId

export default function Quiz() {
  const [lead, setLead] = useState<Lead>(emptyLead)
  const [current, setCurrent] = useState<Current>('abertura')
  const [aguardandoUpload, setAguardandoUpload] = useState(false)
  const [precos, setPrecos] = useState<PrecoRow[]>([])

  const { messages, typing, ready, pushBot, pushUser } = useConversation()
  const fim = useRef<HTMLDivElement>(null)
  const abriu = useRef(false)

  useEffect(() => {
    if (abriu.current) return
    abriu.current = true
    pushBot(ABERTURA)
  }, [pushBot])

  // Busca a tabela de precos assim que a peca e a quantidade existem, pra que o
  // valor ja esteja calculado quando o Lead for disparado na P11.
  useEffect(() => {
    if (!lead.tipo_peca || !lead.quantidade || precos.length) return
    fetchTabelaPrecos()
      .then(setPrecos)
      .catch(() => setPrecos([]))
  }, [lead.tipo_peca, lead.quantidade, precos.length])

  const preco = useMemo(
    () => calcularPreco(precos, lead.tecnica_estampa, lead.tipo_peca, lead.quantidade),
    [precos, lead.tecnica_estampa, lead.tipo_peca, lead.quantidade],
  )

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, typing, current, aguardandoUpload])

  const advance: A.Advance = (patch, userText, interstitial) => {
    const proximoLead = { ...lead, ...patch }
    setLead(proximoLead)
    pushUser(userText)

    if (current === 'p11') {
      pixel.lead(preco.total, { content_name: proximoLead.tipo_peca ?? 'private_label' })
    }

    const alvo = nextStep(current, proximoLead)
    const def = STEPS.find((s) => s.id === alvo)
    pushBot([...(interstitial ?? []), ...(def?.prompts ?? [])])
    setCurrent(alvo)
  }

  function comecar() {
    pixel.quizStarted()
    pushUser('Bora começar')
    const def = STEPS[0]
    pushBot(def.prompts)
    setCurrent(def.id)
  }

  function responderP1(estagio: 'existente' | 'nova', texto: string) {
    advance({ estagio_marca: estagio }, texto, estagio === 'nova' ? [MSG_MARCA_NOVA] : undefined)
  }

  function responderP8(temArte: boolean) {
    if (temArte) {
      setLead((l) => ({ ...l, tem_arte: true }))
      pushUser('Sim, já tenho o arquivo')
      pushBot([MSG_UPLOAD])
      setAguardandoUpload(true)
      return
    }
    advance({ tem_arte: false, arquivo_estampa_url: null }, 'Não, preciso de ajuda pra criar', [
      MSG_SEM_ARTE,
    ])
  }

  function uploadPronto(path: string | null, nomeArquivo?: string) {
    setAguardandoUpload(false)
    advance({ tem_arte: true, arquivo_estampa_url: path }, path ? `Enviei: ${nomeArquivo}` : 'Mando depois')
  }

  const mostrarResposta = ready && !typing
  const pct = progress(current, lead)

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
      <Header />
      <Progress value={pct} />

      <main className="flex-1 px-4 pt-4">
        <div className="grid gap-2">
          {messages.map((m) => (
            <Bubble key={m.id} side={m.side} text={m.text} />
          ))}
          {typing && <Typing />}
        </div>

        <div className="mt-5">
          {mostrarResposta && current !== 'final' && (
            <div className="animate-pop">
              {current === 'abertura' && (
                <button className="btn-primary" onClick={comecar}>
                  Bora começar
                </button>
              )}
              {current === 'p1' && (
                <div className="grid gap-2">
                  <button
                    className="btn"
                    onClick={() =>
                      responderP1('existente', 'Já tenho marca, quero produzir uma nova peça/coleção')
                    }
                  >
                    Já tenho marca, quero produzir uma nova peça/coleção
                  </button>
                  <button className="btn" onClick={() => responderP1('nova', 'Tô começando do zero')}>
                    Tô começando do zero
                  </button>
                </div>
              )}
              {current === 'p2' && <A.P2 lead={lead} advance={advance} />}
              {current === 'p3' && <A.P3 lead={lead} advance={advance} />}
              {current === 'p4' && <A.P4 lead={lead} advance={advance} />}
              {current === 'p5' && <A.P5 lead={lead} advance={advance} />}
              {current === 'p6' && <A.P6 lead={lead} advance={advance} />}
              {current === 'p7' && <A.P7 lead={lead} advance={advance} />}
              {current === 'p8' &&
                (aguardandoUpload ? (
                  <UploadEstampa
                    onDone={(path, nome) => uploadPronto(path, nome)}
                    onSkip={() => uploadPronto(null)}
                  />
                ) : (
                  <div className="grid gap-2">
                    <button className="btn" onClick={() => responderP8(true)}>
                      Sim, já tenho o arquivo
                    </button>
                    <button className="btn" onClick={() => responderP8(false)}>
                      Não, preciso de ajuda pra criar
                    </button>
                  </div>
                ))}
              {current === 'p9' && <A.P9 lead={lead} advance={advance} />}
              {current === 'p10' && <A.P10 lead={lead} advance={advance} />}
              {current === 'p11' && <A.P11 lead={lead} advance={advance} />}
            </div>
          )}

          {current === 'final' && (
            <Suspense fallback={<p className="py-8 text-center text-sm text-mute">Montando seu resumo...</p>}>
              <Final lead={lead} valor={preco.total} precoUnitario={preco.unitario} />
            </Suspense>
          )}
        </div>

        <div ref={fim} className="h-6" />
      </main>
    </div>
  )
}
