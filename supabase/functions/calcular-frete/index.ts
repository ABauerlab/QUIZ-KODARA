/**
 * Edge Function: calcular-frete
 *
 * Cota o frete real no SuperFrete a partir do CEP de destino, do tipo de peça e
 * da quantidade. Roda no backend justamente pra que o token do SuperFrete nunca
 * apareça no bundle do site.
 *
 * Contrato da API confirmado no código do servidor MCP oficial de apoio
 * (github.com/codespar/mcp-dev-latam, packages/ecommerce/superfrete):
 *   POST {base}/api/v0/calculator
 *   headers: Authorization: Bearer <token>, User-Agent: <app> (<email>)
 *   body: { from:{postal_code}, to:{postal_code},
 *           products:[{width,height,length,weight,quantity}],
 *           services:"1,2,3,17,31",
 *           options:{insurance_value,receipt,own_hand} }
 *   services: 1=PAC 2=SEDEX 3=JadLog 17=Mini Envios 31=Loggi
 *
 * A resposta é lida de forma defensiva (ver leCotacoes): qualquer serviço com
 * campo de erro é descartado e o mais barato ganha. Se nada der certo, devolve
 * ok:false e o quiz segue sem travar.
 *
 * Secrets necessários (supabase secrets set):
 *   SUPERFRETE_TOKEN       token da conta, gerado em web.superfrete.com
 *   SUPERFRETE_CEP_ORIGEM  CEP da Kodara em BH, só números
 *   SUPERFRETE_USER_AGENT  ex: "Kodara Quiz/1.0 (contato@vistakodara.com.br)"
 *   SUPERFRETE_SANDBOX     "true" enquanto estiver testando
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TIMEOUT_MS = 5000

// Limites dos Correios pra encomenda. Acima disso não adianta cotar.
const PESO_MAX_KG = 30
const SOMA_DIMENSOES_MAX_CM = 200
const LADO_MAX_CM = 100

// Mínimos exigidos por PAC/SEDEX.
const MIN_LARGURA = 16
const MIN_COMPRIMENTO = 24
const MIN_ALTURA = 4

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

interface Peso {
  peso_kg: number
  largura_cm: number
  comprimento_cm: number
  altura_unitaria_cm: number
}

interface Cotacao {
  valor: number
  servico: string
  prazo_dias: number | null
}

/**
 * Lê a resposta do calculador sem depender de um formato exato: aceita array na
 * raiz ou embrulhado, ignora serviço que veio com erro e pega o mais barato.
 */
function leCotacoes(payload: unknown): Cotacao | null {
  const lista = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Record<string, unknown>)?.data)
      ? ((payload as Record<string, unknown>).data as unknown[])
      : []

  const validas: Cotacao[] = []
  for (const item of lista) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    if (o.error) continue

    const bruto = o.price ?? o.custom_price ?? o.discount
    const valor = typeof bruto === 'string' ? Number(bruto) : typeof bruto === 'number' ? bruto : NaN
    if (!Number.isFinite(valor) || valor <= 0) continue

    const prazoBruto = o.delivery_time ?? o.custom_delivery_time
    const prazo = Number(prazoBruto)

    const empresa = (o.company as Record<string, unknown> | undefined)?.name
    validas.push({
      valor: Number(valor.toFixed(2)),
      servico: [empresa, o.name].filter(Boolean).join(' ').trim() || 'Frete',
      prazo_dias: Number.isFinite(prazo) ? prazo : null,
    })
  }

  if (!validas.length) return null
  return validas.sort((a, b) => a.valor - b.valor)[0]
}

/** Monta a caixa: peças empilhadas, respeitando o mínimo dos Correios. */
function montarPacote(peso: Peso, quantidade: number) {
  const pesoTotal = Number((peso.peso_kg * quantidade).toFixed(3))
  const altura = Math.max(MIN_ALTURA, Math.ceil(peso.altura_unitaria_cm * quantidade))
  const largura = Math.max(MIN_LARGURA, peso.largura_cm)
  const comprimento = Math.max(MIN_COMPRIMENTO, peso.comprimento_cm)
  return { pesoTotal, altura, largura, comprimento }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, motivo: 'metodo_invalido' }, 405)

  const token = Deno.env.get('SUPERFRETE_TOKEN')
  const cepOrigem = (Deno.env.get('SUPERFRETE_CEP_ORIGEM') ?? '').replace(/\D/g, '')
  const userAgent = Deno.env.get('SUPERFRETE_USER_AGENT') ?? 'Kodara Quiz/1.0 (contato@vistakodara.com.br)'
  const base =
    Deno.env.get('SUPERFRETE_SANDBOX') === 'true'
      ? 'https://sandbox.superfrete.com'
      : 'https://api.superfrete.com'

  if (!token || cepOrigem.length !== 8) {
    // Falta configurar o secret. Não é erro do visitante, então responde 200 e
    // o quiz mostra a mensagem de frete a combinar.
    return json({ ok: false, motivo: 'nao_configurado' })
  }

  let body: { cep_destino?: string; tipo_peca?: string; quantidade?: number }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, motivo: 'body_invalido' }, 400)
  }

  const cepDestino = (body.cep_destino ?? '').replace(/\D/g, '')
  const quantidade = Number(body.quantidade)
  const tipoPeca = (body.tipo_peca ?? '').trim()

  if (cepDestino.length !== 8) return json({ ok: false, motivo: 'cep_invalido' }, 400)
  if (!Number.isFinite(quantidade) || quantidade < 1) return json({ ok: false, motivo: 'quantidade_invalida' }, 400)
  if (!tipoPeca) return json({ ok: false, motivo: 'peca_invalida' }, 400)

  // Peso e caixa saem da tabela editável. Service role, então ignora RLS.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { data: pesos } = await supabase
    .from('peso_estimado_pecas')
    .select('tipo_peca, peso_kg, largura_cm, comprimento_cm, altura_unitaria_cm')

  const normaliza = (v: string) => v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const linha = (pesos ?? []).find((p) => normaliza(p.tipo_peca) === normaliza(tipoPeca))

  // Peça fora da tabela de peso: não dá pra cotar honestamente, então avisa.
  if (!linha) return json({ ok: false, motivo: 'peca_sem_peso' })

  const { pesoTotal, altura, largura, comprimento } = montarPacote(linha as Peso, quantidade)

  // Produção grande não cabe numa encomenda só. Isso é caso de transportadora
  // fechada, resolvido no atendimento, não chuta valor aqui.
  if (
    pesoTotal > PESO_MAX_KG ||
    altura > LADO_MAX_CM ||
    altura + largura + comprimento > SOMA_DIMENSOES_MAX_CM
  ) {
    return json({ ok: false, motivo: 'volume_acima_do_limite' })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(`${base}/api/v0/calculator`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': userAgent,
      },
      body: JSON.stringify({
        from: { postal_code: cepOrigem },
        to: { postal_code: cepDestino },
        services: '1,2,3,17,31',
        products: [
          {
            width: largura,
            height: altura,
            length: comprimento,
            weight: pesoTotal,
            quantity: 1,
          },
        ],
        options: { insurance_value: null, receipt: false, own_hand: false },
      }),
    })

    if (!res.ok) {
      console.error('SuperFrete respondeu', res.status, await res.text())
      return json({ ok: false, motivo: 'api_erro' })
    }

    const cotacao = leCotacoes(await res.json())
    if (!cotacao) return json({ ok: false, motivo: 'sem_cotacao' })

    return json({
      ok: true,
      valor: cotacao.valor,
      servico: cotacao.servico,
      prazo_dias: cotacao.prazo_dias,
      pacote: { peso_kg: pesoTotal, altura_cm: altura, largura_cm: largura, comprimento_cm: comprimento },
    })
  } catch (err) {
    // Timeout ou rede fora. O quiz não pode parar por causa disso.
    console.error('Falha ao cotar frete:', err instanceof Error ? err.message : err)
    return json({ ok: false, motivo: 'timeout' })
  } finally {
    clearTimeout(timeout)
  }
})
