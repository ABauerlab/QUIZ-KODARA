import { useEffect, useRef, useState } from 'react'
import { Wordmark } from '../components/Logo'
import { env } from '../lib/env'
import { salvarCompleto } from '../lib/leadStore'
import { pixel } from '../lib/pixel'
import { KIT_MARCA_ITENS, type Lead } from '../lib/types'
import { utmParaTag } from '../lib/utm'
import type { FreteState } from './Quiz'
import { resumoLead } from './resumo'

interface Props {
  lead: Lead
  valor: number | null
  precoUnitario: number | null
  frete: FreteState
}

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
      <span className="text-mute">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/**
 * Monta a mensagem de WhatsApp a partir da MESMA lista de campos (resumoLead)
 * que preenche o card "Fechando aqui", pra nunca mais desatualizar quando uma
 * pergunta nova entrar no quiz. Sem preço nenhum de propósito: o cliente chega
 * no WhatsApp só com o briefing completo, o valor é passado por lá.
 */
function mensagemWhats(lead: Lead, kitItens: string[], kitOutros: string) {
  const respostas = resumoLead(lead)
    .filter((c) => c.value !== null)
    .map((c) => `${c.label}: ${c.value}`)

  const linhas = [
    'Fala Kodara! Acabei de fechar meu briefing no quiz de Private Label.',
    '',
    ...respostas,
    kitItens.length
      ? `Kit Marca: ${kitItens.map((c) => KIT_MARCA_ITENS.find((i) => i.chave === c)?.label ?? c).join(', ')}`
      : null,
    kitOutros.trim() ? `Outros materiais gráficos: ${kitOutros.trim()}` : null,
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
  const [kitItens, setKitItens] = useState<string[]>([])
  const [kitOutros, setKitOutros] = useState('')
  const [retiradaLoja, setRetiradaLoja] = useState(false)
  const tentativa = useRef(0)

  // O preço continua calculado e salvo por baixo dos panos (a Kodara vê no
  // admin), só não aparece pro cliente: o valor é combinado no WhatsApp.
  const valorFrete = retiradaLoja ? 0 : frete.status === 'ok' ? frete.valor : null
  const total = valor !== null ? Number((valor + (valorFrete ?? 0)).toFixed(2)) : null
  const cotandoFrete = frete.status === 'carregando'

  // Reflete a escolha de retirada no resumo mostrado, sem esperar o
  // salvamento no banco pra atualizar a tela.
  const leadComEntrega: Lead = { ...lead, retirada_loja: retiradaLoja }

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
    // Espera o frete resolver antes de salvar, pra que o dado interno (admin)
    // já saia completo — mas isso não trava nem aparece pro cliente.
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

  function irProWhats() {
    pixel.whatsappRedirect(
      total,
      { nome: lead.nome, whatsapp: lead.whatsapp },
      { content_name: lead.tipo_peca ?? 'private_label' },
    )
    window.location.href = `https://wa.me/${env.whatsapp}?text=${mensagemWhats(leadComEntrega, kitItens, kitOutros)}`
  }

  return (
    <div className="grid gap-4 pb-8">
      <div className="rounded-2xl border border-line bg-panel p-4">
        <h2 className="mb-1 text-lg font-bold">Fechando aqui</h2>
        <p className="mb-3 text-sm text-mute">
          Confere se tá tudo certo. O valor da produção a gente já passa direto pra você no
          WhatsApp.
        </p>
        <div>
          {resumoLead(leadComEntrega)
            .filter((c) => c.value !== null)
            .map((c) => (
              <Linha key={c.label} label={c.label} value={c.value!} />
            ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/[0.03] p-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={retiradaLoja}
            onChange={(e) => setRetiradaLoja(e.target.checked)}
          />
          Prefiro retirar na loja (Praça Sete, BH) em vez de receber por entrega
        </label>
        {retiradaLoja && (
          <p className="mt-1 text-xs text-mute">
            Retirada na Rua Rio de Janeiro, 462, sala 2217, Praça Sete, Belo Horizonte – MG.
          </p>
        )}
        <p className="mt-3 rounded-xl border border-line bg-ink/40 p-3 text-xs text-mute">
          Antes de fechar a produção, a gente te manda um mockup pelo WhatsApp — a visualização de
          como a estampa fica na peça, na cor e modelagem escolhidas. A produção só começa depois de
          você aprovar.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-4">
        <h3 className="font-bold">Kit Marca</h3>
        <p className="mt-1 text-sm text-mute">
          Aqui você encontra tudo pra sua marca, da estampa ao material gráfico completo. Quer
          incluir algum item no seu briefing? A gente já passa os valores certinhos no WhatsApp.
        </p>
        <div className="mt-3 grid gap-2">
          {KIT_MARCA_ITENS.map((item) => (
            <label
              key={item.chave}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-ink/40 px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={kitItens.includes(item.chave)}
                onChange={() => toggleKitItem(item.chave)}
              />
              <span>
                {item.label}
                <span className="block text-xs text-mute">{item.descricao}</span>
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
      </div>

      <div className="sticky bottom-0 -mx-4 border-t border-line bg-ink/95 px-4 py-3 backdrop-blur">
        <button className="btn-primary" disabled={!liberado} onClick={irProWhats}>
          {cotandoFrete
            ? 'Preparando seu briefing...'
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
