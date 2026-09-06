import { useEffect, useMemo, useRef, useState } from 'react'
import { Wordmark } from '../components/Logo'
import { env } from '../lib/env'
import { formatBRL, textoCondicoesPagamento } from '../lib/format'
import { salvarCompleto } from '../lib/leadStore'
import { pixel } from '../lib/pixel'
import { fetchCondicoesPagamento } from '../lib/pricing'
import { CONDICOES_PAGAMENTO_PADRAO, KIT_MARCA_ITENS, type CondicoesPagamento, type Lead } from '../lib/types'
import { utmParaTag } from '../lib/utm'
import type { FreteState } from './Quiz'
import { resumoLead } from './resumo'

interface Props {
  lead: Lead
  valor: number | null
  precoUnitario: number | null
  frete: FreteState
}

const MSG_FRETE_INDISPONIVEL = 'Frete calculado na hora de fechar com a gente'

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-mute">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function precoKitMarcaItem(chave: string, quantidadePecas: number | null): number {
  const item = KIT_MARCA_ITENS.find((i) => i.chave === chave)
  if (!item) return 0
  if (item.preco !== null) return item.preco
  // Ziplock: R$2 por unidade, uma pra cada peça do pedido.
  return 2 * (quantidadePecas ?? 0)
}

/**
 * Monta a mensagem de WhatsApp a partir da MESMA lista de campos (resumoLead)
 * que preenche o card "Fechando aqui", pra nunca mais desatualizar quando uma
 * pergunta nova entrar no quiz — junto com os valores e condições, que têm
 * formatação própria (número grande, aproximado) e por isso ficam à parte.
 */
function mensagemWhats(
  lead: Lead,
  pecas: number | null,
  valorFrete: number | null,
  total: number | null,
  kitItens: string[],
  kitOutros: string,
  retiradaLoja: boolean,
  condicoes: CondicoesPagamento,
) {
  const respostas = resumoLead(lead)
    .filter((c) => c.value !== null && c.label !== 'Entrega') // Entrega já vira "Frete"/CEP abaixo, pra não duplicar.
    .map((c) => `${c.label}: ${c.value}`)

  const linhas = [
    'Fala Kodara! Acabei de fechar meu briefing no quiz de Private Label.',
    '',
    ...respostas,
    retiradaLoja ? 'Entrega: retirada na loja (Praça Sete, BH)' : `CEP: ${lead.cep_destino ?? ''}`,
    '',
    `Peças: ${pecas ? `a partir de ${formatBRL(pecas)} (aproximado)` : 'sob consulta'}`,
    `Frete: ${retiradaLoja ? 'grátis, retirada na loja' : valorFrete ? `${formatBRL(valorFrete)} (estimado)` : 'a calcular'}`,
    kitItens.length
      ? `Kit Marca: ${kitItens.map((c) => KIT_MARCA_ITENS.find((i) => i.chave === c)?.label ?? c).join(', ')}`
      : null,
    kitOutros.trim() ? `Outros materiais gráficos: ${kitOutros.trim()}` : null,
    `Total aproximado: ${total ? `${formatBRL(total)}, sujeito a confirmação` : 'sob consulta'}`,
    '',
    textoCondicoesPagamento(condicoes),
  ].filter((l): l is string => l !== null)

  // Tag discreta de origem (utm_campaign/utm_content), só aparece quando o
  // quiz foi aberto a partir de um link com UTM — não polui a mensagem de
  // quem chegou direto ou por indicação.
  const tagUtm = utmParaTag({
    utm_source: lead.utm_source ?? undefined,
    utm_medium: lead.utm_medium ?? undefined,
    utm_campaign: lead.utm_campaign ?? undefined,
    utm_content: lead.utm_content ?? undefined,
    utm_term: lead.utm_term ?? undefined,
  })
  if (tagUtm) linhas.push('', `[ref: ${tagUtm}]`)

  return encodeURIComponent(linhas.join('\n'))
}

export default function Final({ lead, valor, precoUnitario, frete }: Props) {
  const [salvo, setSalvo] = useState(false)
  const [erroSalvar, setErroSalvar] = useState(false)
  const [salvando, setSalvando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [kitItens, setKitItens] = useState<string[]>([])
  const [kitOutros, setKitOutros] = useState('')
  const [retiradaLoja, setRetiradaLoja] = useState(false)
  const [condicoes, setCondicoes] = useState<CondicoesPagamento>(CONDICOES_PAGAMENTO_PADRAO)
  const tentativa = useRef(0)

  useEffect(() => {
    fetchCondicoesPagamento()
      .then(setCondicoes)
      .catch(() => setCondicoes(CONDICOES_PAGAMENTO_PADRAO))
  }, [])

  // Quem retira na loja não paga frete nenhum, mesmo que uma cotação já tenha voltado.
  const valorFrete = retiradaLoja ? 0 : frete.status === 'ok' ? frete.valor : null
  const kitMarcaTotal = useMemo(
    () => kitItens.reduce((soma, chave) => soma + precoKitMarcaItem(chave, lead.quantidade), 0),
    [kitItens, lead.quantidade],
  )
  // Sem valor de peça não existe total: frete sozinho não é o preço do pedido.
  const total =
    valor !== null ? Number((valor + (valorFrete ?? 0) + kitMarcaTotal).toFixed(2)) : null
  const cotandoFrete = frete.status === 'carregando'

  function toggleKitItem(chave: string) {
    setKitItens((s) => (s.includes(chave) ? s.filter((c) => c !== chave) : [...s, chave]))
  }

  async function salvar() {
    setSalvando(true)
    setErroSalvar(false)
    tentativa.current += 1
    try {
      await salvarCompleto({
        ...lead,
        valor_estimado: valor,
        preco_unitario: precoUnitario,
        valor_frete_calculado: valorFrete,
        valor_total_com_frete: total,
        retirada_loja: retiradaLoja,
        kit_marca_itens: kitItens.length ? kitItens : null,
        kit_marca_outros: kitOutros.trim() || null,
      })
      setSalvo(true)
      pixel.quizCompleted(
        total,
        { nome: lead.nome, whatsapp: lead.whatsapp },
        { content_name: lead.tipo_peca ?? 'private_label' },
      )
    } catch {
      setErroSalvar(true)
    } finally {
      setSalvando(false)
    }
  }

  useEffect(() => {
    // Espera o frete resolver pra que o valor mandado pro Meta e gravado no
    // banco seja o total de verdade, e não o parcial sem frete.
    if (cotandoFrete || tentativa.current > 0) return
    pixel.initiateCheckout(
      total,
      { nome: lead.nome, whatsapp: lead.whatsapp },
      { content_name: lead.tipo_peca ?? 'private_label' },
    )
    void salvar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotandoFrete])

  // Reflete a escolha do Kit Marca e da retirada na loja no lead salvo, já
  // que as duas acontecem depois do salvamento inicial.
  useEffect(() => {
    if (!salvo) return
    void salvar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kitItens, kitOutros, retiradaLoja])

  // O lead nunca fica preso: depois de uma tentativa que falhou, o WhatsApp libera.
  const liberado = !cotandoFrete && (salvo || (erroSalvar && !salvando))

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(env.pixKey)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  const entrada = total ? (total * condicoes.entrada_pct) / 100 : null

  function irProWhats() {
    pixel.whatsappRedirect(
      total,
      { nome: lead.nome, whatsapp: lead.whatsapp },
      { content_name: lead.tipo_peca ?? 'private_label' },
    )
    window.location.href = `https://wa.me/${env.whatsapp}?text=${mensagemWhats(lead, valor, valorFrete, total, kitItens, kitOutros, retiradaLoja, condicoes)}`
  }

  return (
    <div className="grid gap-4 pb-8">
      <div className="rounded-2xl border border-line bg-panel p-4">
        <h2 className="mb-1 text-lg font-bold">Fechando aqui</h2>
        <p className="mb-3 text-sm text-mute">
          Confere se tá tudo certo. O que precisar ajustar a gente acerta no WhatsApp.
        </p>
        <div>
          {resumoLead(lead)
            .filter((c) => c.value !== null)
            .map((c) => (
              <Linha key={c.label} label={c.label} value={c.value!} />
            ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
        {valor ? (
          <>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-mute">Peças (aproximado)</span>
              <span className="font-medium">{formatBRL(valor)}</span>
            </div>
            <div className="mt-2 flex justify-between gap-4 text-sm">
              <span className="text-mute">Frete estimado</span>
              <span className="font-medium">
                {retiradaLoja
                  ? 'Grátis (retirada na loja)'
                  : cotandoFrete
                    ? 'calculando...'
                    : valorFrete !== null
                      ? formatBRL(valorFrete)
                      : 'a combinar'}
              </span>
            </div>
            <label className="mt-2 flex items-center gap-2 text-xs text-mute">
              <input
                type="checkbox"
                checked={retiradaLoja}
                onChange={(e) => setRetiradaLoja(e.target.checked)}
              />
              Prefiro retirar na loja (Praça Sete, BH) em vez de receber por frete
            </label>
            {retiradaLoja && (
              <p className="mt-1 text-xs text-mute">
                Retirada na Rua Rio de Janeiro, 462, sala 2217, Praça Sete, Belo Horizonte – MG.
              </p>
            )}
            {kitMarcaTotal > 0 && (
              <div className="mt-2 flex justify-between gap-4 text-sm">
                <span className="text-mute">Kit Marca</span>
                <span className="font-medium">{formatBRL(kitMarcaTotal)}</span>
              </div>
            )}
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-sm text-mute">Total aproximado</p>
              <p className="text-3xl font-black text-brand">{total ? formatBRL(total) : '...'}</p>
              {precoUnitario && (
                <p className="mt-1 text-xs text-mute">{formatBRL(precoUnitario)} por peça (aproximado)</p>
              )}
              <p className="mt-1 text-xs text-mute">Sujeito a confirmação no WhatsApp.</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-mute">Valor total</p>
            <p className="text-2xl font-black text-brand">Valor sob consulta</p>
            <p className="mt-1 text-xs text-mute">
              Sua combinação sai da tabela padrão. A gente fecha o valor direto com você.
            </p>
          </>
        )}

        {!retiradaLoja && !cotandoFrete && valorFrete === null && (
          <p className="mt-2 text-xs text-mute">{MSG_FRETE_INDISPONIVEL}.</p>
        )}
        {!retiradaLoja && valorFrete !== null && frete.servico && (
          <p className="mt-2 text-xs text-mute">
            {frete.servico}
            {frete.prazo_dias ? `, cerca de ${frete.prazo_dias} dias úteis depois de pronto` : ''}
          </p>
        )}

        <p className="mt-3 text-sm">
          Pra dar início na produção, é {condicoes.entrada_pct}% no fechamento
          {entrada ? ` (${formatBRL(entrada)}, aproximado)` : ''} e o restante antes do envio.
        </p>
        <p className="mt-2 text-xs text-mute">{textoCondicoesPagamento(condicoes)}</p>
        <p className="mt-3 rounded-xl border border-line bg-ink/40 p-3 text-xs text-mute">
          Antes de fechar a produção, a gente te manda um mockup pelo WhatsApp — a visualização de
          como a estampa fica na peça, na cor e modelagem escolhidas. A produção só começa depois de
          você aprovar.
        </p>
      </div>

      {env.pixKey && (
        <div className="rounded-2xl border border-line bg-panel p-4">
          <p className="text-sm text-mute">Chave PIX da Kodara</p>
          <p className="mt-1 break-all font-mono text-sm">{env.pixKey}</p>
          <button type="button" className="btn mt-3 text-center font-semibold" onClick={copiarPix}>
            {copiado ? 'Copiado!' : 'Copiar chave PIX'}
          </button>
          <p className="mt-3 text-sm text-mute">
            Depois de pagar, é só mandar o comprovante direto pro nosso WhatsApp que a gente já dá
            sequência com tudo certo.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-panel p-4">
        <h3 className="font-bold">Kit Marca</h3>
        <p className="mt-1 text-sm text-mute">
          Aqui você encontra tudo pra sua marca, da estampa ao material gráfico completo. Quer
          adicionar algum item ao seu pedido?
        </p>
        <div className="mt-3 grid gap-2">
          {KIT_MARCA_ITENS.map((item) => (
            <label
              key={item.chave}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-ink/40 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={kitItens.includes(item.chave)}
                  onChange={() => toggleKitItem(item.chave)}
                />
                <span>
                  {item.label}
                  <span className="block text-xs text-mute">{item.descricao}</span>
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand">
                {formatBRL(precoKitMarcaItem(item.chave, lead.quantidade))}
              </span>
            </label>
          ))}
        </div>
        <input
          className="field mt-3"
          placeholder="Quer outro material gráfico? Conta aqui (opcional)"
          value={kitOutros}
          onChange={(e) => setKitOutros(e.target.value)}
        />
        {kitMarcaTotal > 0 && (
          <p className="mt-2 text-sm text-mute">
            Kit Marca adicionado: <span className="font-semibold text-white">{formatBRL(kitMarcaTotal)}</span>
          </p>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur">
        <button className="btn-primary" disabled={!liberado} onClick={irProWhats}>
          {cotandoFrete
            ? 'Calculando seu frete...'
            : liberado
              ? 'Falar agora no WhatsApp da Kodara'
              : 'Salvando seu briefing...'}
        </button>
        {erroSalvar && (
          <p className="mt-2 text-center text-xs text-mute">
            Deu ruim pra salvar aqui, mas seu resumo já vai pronto na mensagem.{' '}
            <button className="underline" onClick={() => void salvar()}>
              Tentar salvar de novo
            </button>
          </p>
        )}
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <Wordmark className="h-5 w-auto text-white/60" />
          <p className="text-center text-xs text-mute">Sinta-se livre, vista Kodara!</p>
        </div>
      </div>
    </div>
  )
}
