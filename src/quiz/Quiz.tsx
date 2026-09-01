import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { Bubble, Header, Progress, Typing } from '../components/Chat'
import { Splash } from '../components/Splash'
import { env } from '../lib/env'
import { calcularFrete } from '../lib/frete'
import { salvarParcial } from '../lib/leadStore'
import { pixel } from '../lib/pixel'
import { calcularPrecoLead, fetchTabelaPrecos } from '../lib/pricing'
import { emptyLead, type Lead, type PrecoRow } from '../lib/types'
import { capturarUtm } from '../lib/utm'
import * as A from './Answers'
import { UploadEstampa } from './UploadEstampa'
import { useConversation } from './useConversation'
import {
  MSG_MARCA_NOVA,
  MSG_SEM_ARTE,
  MSG_UPLOAD,
  STEPS,
  aberturaMensagens,
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

/** Um retrato do estado exatamente antes de uma pergunta ser respondida. */
interface HistoryEntry {
  step: Current
  lead: Lead
  msgCount: number
  frete: FreteState
}

/** Junta o UTM capturado na URL de entrada ao lead vazio, uma vez só, no primeiro render. */
function leadInicial(): Lead {
  const utm = capturarUtm()
  if (!utm) return emptyLead
  return {
    ...emptyLead,
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    utm_term: utm.utm_term ?? null,
  }
}

export default function Quiz() {
  const [lead, setLead] = useState<Lead>(leadInicial)
  const [current, setCurrent] = useState<Current>('abertura')
  const [aguardandoUpload, setAguardandoUpload] = useState(false)
  const [precos, setPrecos] = useState<PrecoRow[]>([])
  const [frete, setFrete] = useState<FreteState>(FRETE_INICIAL)
  const [splash, setSplash] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const { messages, typing, ready, pushBot, pushUser, rewindTo } = useConversation()
  const fim = useRef<HTMLDivElement>(null)
  const abriu = useRef(false)

  useEffect(() => {
    if (abriu.current) return
    abriu.current = true
    pushBot(aberturaMensagens())
  }, [pushBot])

  // Busca a tabela de precos assim que a peca e a quantidade existem, pra que o
  // valor ja esteja calculado quando o Lead for disparado na P11.
  useEffect(() => {
    if (!lead.tipo_peca || !lead.quantidade || precos.length) return
    fetchTabelaPrecos()
      .then(setPrecos)
      .catch(() => setPrecos([]))
  }, [lead.tipo_peca, lead.quantidade, precos.length])

  const preco = useMemo(() => calcularPrecoLead(precos, lead), [precos, lead])

  useEffect(() => {
    // Em mobile, fechar o teclado (ver blurAtivo em advance/comecar) muda a
    // altura visível da viewport no mesmo instante em que a resposta troca de
    // tela. Rolar na hora, no meio dessas duas mudanças de layout, é o que
    // deixava aparecer aquele vão preto grande no topo antes de estabilizar.
    // Um frame de folga deixa o layout assentar antes de rolar.
    const id = requestAnimationFrame(() => {
      fim.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
    return () => cancelAnimationFrame(id)
  }, [messages.length, typing, current, aguardandoUpload])

  /** Junta o que ja foi respondido com o que foi calculado, do jeito que vai pro banco. */
  function comValores(base: Lead, freteAtual: FreteState = frete): Lead {
    const p = calcularPrecoLead(precos, base)
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

  /**
   * Registra o estado exatamente como está agora, antes de uma resposta mudar
   * qualquer coisa. É pra onde o botão de voltar restaura.
   */
  function pushHistory() {
    setHistory((h) => [...h, { step: current, lead, msgCount: messages.length, frete }])
  }

  /**
   * Fecha o teclado do celular ANTES da tela trocar, em vez de deixar o
   * teclado fechar sozinho ao mesmo tempo em que o layout muda de pergunta.
   * As duas coisas juntas é o que causava aquele vão preto no topo da tela.
   */
  function blurAtivo() {
    const ativo = document.activeElement
    if (ativo instanceof HTMLElement) ativo.blur()
  }

  const advance: A.Advance = (patch, userText, interstitial) => {
    blurAtivo()
    pushHistory()
    const proximoLead = { ...lead, ...patch }
    setLead(proximoLead)
    pushUser(userText)

    if (current === 'p11') {
      pixel.lead(
        preco.total,
        { nome: proximoLead.nome, whatsapp: proximoLead.whatsapp },
        { content_name: proximoLead.tipo_peca ?? 'private_label' },
      )
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
    pushHistory()
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
      // Não passa por advance: é um sub-estado da própria P8, não avança pergunta.
      pushHistory()
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

  /**
   * Desfaz a última resposta: volta pra pergunta anterior com a conversa e o
   * lead exatamente como estavam antes dela. Não recalcula o caminho pra
   * frente, só reproduz o que já foi de fato percorrido.
   */
  function voltar() {
    if (!history.length) return
    blurAtivo()
    const entry = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    rewindTo(entry.msgCount)
    setLead(entry.lead)
    setCurrent(entry.step)
    setFrete(entry.frete)
    setAguardandoUpload(false)
    salvarParcial(comValores(entry.lead, entry.frete), entry.step)
  }

  /**
   * Recomeça a conversa do zero, sem recarregar a página. O que já foi
   * enviado continua salvo no banco (cada resposta grava incremental); só a
   * tela local volta pro início, pra corrigir tudo de uma vez quando o
   * cliente errou lá atrás e não quer voltar pergunta por pergunta.
   */
  function reiniciar() {
    if (current === 'abertura') return
    if (!window.confirm('Recomeçar do início? As respostas já preenchidas nessa tela vão sumir.')) return
    blurAtivo()
    setHistory([])
    setLead(leadInicial())
    setFrete(FRETE_INICIAL)
    setAguardandoUpload(false)
    setCurrent('abertura')
    rewindTo(0)
    pushBot(aberturaMensagens())
  }

  /**
   * Saída de emergência: se o atendimento automático travar ou o cliente só
   * preferir seguir por gente mesmo, cai pro WhatsApp a qualquer momento,
   * levando junto o que já foi respondido até aqui.
   */
  function mensagemWhatsFallback() {
    const linhas = ['Oi! Comecei o quiz de Private Label no site mas prefiro continuar por aqui.']
    if (lead.nome) linhas.push(`Nome: ${lead.nome}`)
    if (lead.tipo_peca) linhas.push(`Peça: ${lead.tipo_peca}`)
    if (lead.quantidade) linhas.push(`Quantidade: ${lead.quantidade}`)
    return encodeURIComponent(linhas.join('\n'))
  }

  function irDireitoWhats() {
    pixel.whatsappRedirect(
      null,
      { nome: lead.nome, whatsapp: lead.whatsapp },
      { content_name: 'fallback_atendimento' },
    )
    window.location.href = `https://wa.me/${env.whatsapp}?text=${mensagemWhatsFallback()}`
  }

  const mostrarResposta = ready && !typing
  const pct = progress(current, lead)
  const podeVoltar = history.length > 0 && current !== 'final'
  const podeReiniciar = current !== 'abertura'

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col">
      {splash && <Splash onFim={() => setSplash(false)} />}
      <Header
        podeVoltar={podeVoltar}
        onVoltar={voltar}
        podeReiniciar={podeReiniciar}
        onReiniciar={reiniciar}
        onWhatsapp={irDireitoWhats}
      />
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
              {current === 'p2m' && <A.P2M lead={lead} advance={advance} />}
              {current === 'p2t' && <A.P2T lead={lead} advance={advance} />}
              {current === 'p3' && <A.P3 lead={lead} advance={advance} />}
              {current === 'p4' && <A.P4 lead={lead} advance={advance} />}
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
              {current === 'p9d' && <A.P9D lead={lead} advance={advance} />}
              {current === 'p10' && <A.P10 lead={lead} advance={advance} />}
              {current === 'p11' && <A.P11 lead={lead} advance={advance} />}
              {current === 'p12' && <A.P12 lead={lead} advance={advance} />}

              {/* Além do chevron discreto no header, o botão de voltar
                  também aparece aqui, visível embaixo de cada pergunta —
                  ninguém devia precisar procurar pra corrigir uma resposta. */}
              {podeVoltar && (
                <button
                  type="button"
                  onClick={voltar}
                  className="mt-3 block text-sm font-medium text-mute underline decoration-dotted underline-offset-4 transition active:scale-95"
                >
                  ← Corrigir resposta anterior
                </button>
              )}
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
