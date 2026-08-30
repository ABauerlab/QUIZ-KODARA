import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Bubble, Header, Progress, Typing } from '../components/Chat'
import { Splash } from '../components/Splash'
import { calcularFrete } from '../lib/frete'
import { salvarParcial } from '../lib/leadStore'
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

export interface FreteState {
  status: 'ocioso' | 'carregando' | 'ok' | 'falhou'
  valor: number | null
  servico: string | null
  prazo_dias: number | null
}

const FRETE_INICIAL: FreteState = { status: 'ocioso', valor: null, servico: null, prazo_dias: null }

export default function Quiz() {
  const [lead, setLead] = useState<Lead>(emptyLead)
  const [current, setCurrent] = useState<Current>('abertura')
  const [aguardandoUpload, setAguardandoUpload] = useState(false)
  const [precos, setPrecos] = useState<PrecoRow[]>([])
  const [frete, setFrete] = useState<FreteState>(FRETE_INICIAL)
  const [splash, setSplash] = useState(true)

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

  /** Junta o que ja foi respondido com o que foi calculado, do jeito que vai pro banco. */
  function comValores(base: Lead, freteAtual: FreteState = frete): Lead {
    const p = calcularPreco(precos, base.tecnica_estampa, base.tipo_peca, base.quantidade)
    const valorFrete = freteAtual.status === 'ok' ? freteAtual.valor : null
    return {
      ...base,
      valor_estimado: p.total,
      preco_unitario: p.unitario,
      valor_frete_calculado: valorFrete,
      valor_total_com_frete: p.total !== null ? Number((p.total + (valorFrete ?? 0)).toFixed(2)) : null,
    }
  }

  /** Cota o frete assim que o CEP chega, pra tela final ja abrir com o numero. */
  async function dispararFrete(base: Lead) {
    if (!base.cep_destino || !base.tipo_peca || !base.quantidade) return
    setFrete({ ...FRETE_INICIAL, status: 'carregando' })

    const r = await calcularFrete({
      cep_destino: base.cep_destino,
      tipo_peca: base.tipo_peca,
      quantidade: base.quantidade,
    })

    const proximo: FreteState = r.ok
      ? { status: 'ok', valor: r.valor, servico: r.servico, prazo_dias: r.prazo_dias }
      : { ...FRETE_INICIAL, status: 'falhou' }

    setFrete(proximo)
    salvarParcial(comValores(base, proximo), 'p12')
  }

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

    // Grava a cada resposta: quem abandonar no meio ainda fica registrado.
    salvarParcial(comValores(proximoLead), alvo)

    if (current === 'p12') void dispararFrete(proximoLead)
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
      {splash && <Splash onFim={() => setSplash(false)} />}
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
              {current === 'p12' && <A.P12 lead={lead} advance={advance} />}
            </div>
          )}

          {current === 'final' && (
            <Suspense fallback={<p className="py-8 text-center text-sm text-mute">Montando seu resumo...</p>}>
              <Final
                lead={lead}
                valor={preco.total}
                precoUnitario={preco.unitario}
                frete={frete}
              />
            </Suspense>
          )}
        </div>

        <div ref={fim} className="h-6" />
      </main>
    </div>
  )
}
