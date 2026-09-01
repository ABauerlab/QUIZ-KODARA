import { useState } from 'react'
import { env } from '../lib/env'
import { isValidCep, isValidPhone, maskCep, maskPhone } from '../lib/format'
import { MODELAGENS_CAMISA, TECIDOS_CAMISA, type GradeTamanhos, type Lead } from '../lib/types'
import { MSG_ETIQUETA, MSG_QUALIDADE } from './steps'

export type Advance = (patch: Partial<Lead>, userText: string, interstitial?: string[]) => void

interface Props {
  lead: Lead
  advance: Advance
}

function Options({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2">{children}</div>
}

function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-full border px-4 py-2 text-sm transition active:scale-95 ' +
        (active ? 'border-brand bg-brand font-semibold text-ink' : 'border-line bg-panel text-white')
      }
    >
      {children}
    </button>
  )
}

/** Campo de texto livre usado quando o usuario escolhe "Outra/Outro". */
function FreeText({
  placeholder,
  cta = 'Continuar',
  onSubmit,
}: {
  placeholder: string
  cta?: string
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (trimmed) onSubmit(trimmed)
      }}
    >
      <input
        autoFocus
        className="field"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button className="btn-primary" disabled={!trimmed}>
        {cta}
      </button>
    </form>
  )
}

const PECAS = ['Camiseta', 'Moletom', 'Boné', 'Ecobag']

export function P2({ advance }: Props) {
  const [outra, setOutra] = useState(false)
  if (outra) {
    return (
      <FreeText
        placeholder="Qual peça?"
        onSubmit={(v) => advance({ tipo_peca: v }, v)}
      />
    )
  }
  return (
    <Options>
      {PECAS.map((p) => (
        <button key={p} className="btn" onClick={() => advance({ tipo_peca: p }, p)}>
          {p}
        </button>
      ))}
      <button className="btn" onClick={() => setOutra(true)}>
        Outra peça
      </button>
    </Options>
  )
}

const FAIXAS: { label: string; valor: number }[] = [
  { label: '1-9', valor: 5 },
  { label: '10-29', valor: 20 },
  { label: '30-59', valor: 40 },
  { label: '60+', valor: 60 },
]

export function P3({ advance }: Props) {
  const [value, setValue] = useState('')
  const qtd = Number.parseInt(value, 10)
  const valido = Number.isFinite(qtd) && qtd >= 1

  function submit() {
    if (!valido) return
    const patch: Partial<Lead> = { quantidade: qtd }
    const texto = `${qtd} peça${qtd > 1 ? 's' : ''}`
    if (qtd < 20) {
      // Abaixo de 20 a producao e sempre DTF, entao a P4 nao faz sentido.
      patch.tecnica_estampa = 'dtf'
      advance(patch, texto, [
        'Pra essa quantidade a gente trabalha com DTF, que libera produção a partir de 1 peça. Ótimo pra testar antes de produzir em escala.',
      ])
      return
    }
    advance(patch, texto)
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        {FAIXAS.map((f) => (
          <Chip key={f.label} onClick={() => setValue(String(f.valor))}>
            {f.label}
          </Chip>
        ))}
      </div>
      <form
        className="grid gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          className="field"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Quantidade de peças"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, '').slice(0, 5))}
        />
        <p className="text-xs text-mute">Toca numa faixa pra preencher rápido, dá pra ajustar o número.</p>
        <button className="btn-primary" disabled={!valido}>
          Continuar
        </button>
      </form>
    </div>
  )
}

export function P4({ advance }: Props) {
  return (
    <Options>
      <button
        className="btn"
        onClick={() =>
          advance(
            { tecnica_estampa: 'silk', precisa_orientacao_tecnica: false },
            'Silk (estampa única em volume maior)',
          )
        }
      >
        Silk (ideal pra estampa única em volume maior, custo por peça menor)
      </button>
      <button
        className="btn"
        onClick={() =>
          advance(
            { tecnica_estampa: 'dtf', precisa_orientacao_tecnica: false },
            'DTF (estampa colorida ou detalhada)',
          )
        }
      >
        DTF (mais flexível pra estampa colorida ou detalhada, sem mínimo alto)
      </button>
      <button
        className="btn"
        onClick={() =>
          advance(
            { tecnica_estampa: 'indicacao', precisa_orientacao_tecnica: true },
            'Não sei, quero indicação da Kodara',
          )
        }
      >
        Não sei, quero indicação da Kodara
      </button>
    </Options>
  )
}

export function P2M({ advance }: Props) {
  const [outra, setOutra] = useState(false)
  if (outra) {
    return <FreeText placeholder="Qual modelagem?" onSubmit={(v) => advance({ modelagem: v }, v)} />
  }
  return (
    <Options>
      {MODELAGENS_CAMISA.map((m) => (
        <button key={m} className="btn" onClick={() => advance({ modelagem: m }, m)}>
          {m}
        </button>
      ))}
      <button className="btn" onClick={() => setOutra(true)}>
        Outra modelagem
      </button>
    </Options>
  )
}

const MSGS_TECIDO = [MSG_QUALIDADE, MSG_ETIQUETA]

export function P2T({ advance }: Props) {
  const [outro, setOutro] = useState(false)
  if (outro) {
    return (
      <FreeText placeholder="Qual tecido?" onSubmit={(v) => advance({ tecido: v }, v, MSGS_TECIDO)} />
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {TECIDOS_CAMISA.map((t) => (
        <Chip key={t} onClick={() => advance({ tecido: t }, t, MSGS_TECIDO)}>
          {t}
        </Chip>
      ))}
      <Chip onClick={() => setOutro(true)}>Outro / não sei</Chip>
    </div>
  )
}

const CORES = ['Preto', 'Branco', 'Off-white']

export function P6({ advance }: Props) {
  const [sel, setSel] = useState<string[]>([])
  const [outra, setOutra] = useState('')
  const escolhidas = [...sel, ...(outra.trim() ? [outra.trim()] : [])]

  function toggle(cor: string) {
    setSel((s) => (s.includes(cor) ? s.filter((c) => c !== cor) : [...s, cor]))
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!escolhidas.length) return
        const texto = escolhidas.join(', ')
        advance({ cores: texto }, texto)
      }}
    >
      <div className="flex flex-wrap gap-2">
        {CORES.map((c) => (
          <Chip key={c} active={sel.includes(c)} onClick={() => toggle(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <input
        className="field"
        placeholder="Outra cor (opcional)"
        value={outra}
        onChange={(e) => setOutra(e.target.value)}
      />
      <button className="btn-primary" disabled={!escolhidas.length}>
        Continuar
      </button>
    </form>
  )
}

const TAMANHOS = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'EXG']

export function P7({ lead, advance }: Props) {
  const [grade, setGrade] = useState<GradeTamanhos>({})
  const [outroNome, setOutroNome] = useState('')
  const [outroQtd, setOutroQtd] = useState('')

  const final: GradeTamanhos = { ...grade }
  const outroQ = Number.parseInt(outroQtd, 10)
  if (outroNome.trim() && Number.isFinite(outroQ) && outroQ > 0) final[outroNome.trim().toUpperCase()] = outroQ

  const total = Object.values(final).reduce((a, b) => a + b, 0)
  const esperado = lead.quantidade ?? 0

  function set(t: string, raw: string) {
    const n = Number.parseInt(raw.replace(/\D/g, ''), 10)
    setGrade((g) => {
      const next = { ...g }
      if (Number.isFinite(n) && n > 0) next[t] = n
      else delete next[t]
      return next
    })
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!total) return
        const texto = Object.entries(final)
          .map(([t, q]) => `${t}: ${q}`)
          .join(' | ')
        advance({ grade_tamanhos: final }, texto)
      }}
    >
      <div className="grid gap-2 rounded-2xl border border-line bg-panel p-3">
        {TAMANHOS.map((t) => (
          <div key={t} className="flex items-center gap-3">
            <span className="w-10 text-sm font-semibold text-mute">{t}</span>
            <input
              className="field flex-1 py-2"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={grade[t] ?? ''}
              onChange={(e) => set(t, e.target.value)}
            />
          </div>
        ))}
        <div className="flex items-center gap-3">
          <input
            className="field w-24 py-2"
            placeholder="Outro"
            value={outroNome}
            onChange={(e) => setOutroNome(e.target.value.slice(0, 6))}
          />
          <input
            className="field flex-1 py-2"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={outroQtd}
            onChange={(e) => setOutroQtd(e.target.value.replace(/\D/g, '').slice(0, 5))}
          />
        </div>
      </div>
      <p className="text-xs text-mute">
        Total na grade: {total}
        {esperado > 0 && total !== esperado
          ? `. Você tinha falado ${esperado}, dá pra acertar isso no WhatsApp depois.`
          : ''}
      </p>
      <button className="btn-primary" disabled={!total}>
        Continuar
      </button>
    </form>
  )
}

export function P9({ advance }: Props) {
  const [outro, setOutro] = useState(false)
  const opcoes = ['Peito pequeno', 'Peito grande', 'Costas', 'Manga']
  if (outro) {
    return (
      <FreeText
        placeholder="Onde e de que tamanho?"
        onSubmit={(v) => advance({ posicao_tamanho_estampa: v }, v)}
      />
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <Chip key={o} onClick={() => advance({ posicao_tamanho_estampa: o }, o)}>
          {o}
        </Chip>
      ))}
      <Chip onClick={() => setOutro(true)}>Outro</Chip>
    </div>
  )
}

const CONTAGEM_CORES = [1, 2, 3, 4, 5]
const CONTAGEM_APLICACOES: { valor: number; label: string }[] = [
  { valor: 1, label: '1 (só uma posição)' },
  { valor: 2, label: '2 (ex: frente + costas)' },
  { valor: 3, label: '3 (ex: frente + costas + etiqueta)' },
]

/** Detalhe técnico que fecha o custo real: cores no silk, tamanho e aplicações no DTF. */
export function P9D({ lead, advance }: Props) {
  const [cores, setCores] = useState<number | null>(null)

  if (lead.tecnica_estampa === 'silk') {
    return (
      <div className="grid gap-3">
        <p className="text-sm text-mute">Quantas cores tem sua estampa?</p>
        <div className="flex flex-wrap gap-2">
          {CONTAGEM_CORES.map((c) => (
            <Chip key={c} active={cores === c} onClick={() => setCores(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <button
          className="btn-primary"
          disabled={!cores}
          onClick={() => {
            if (!cores) return
            advance({ cores_estampa: cores }, `${cores} cor${cores > 1 ? 'es' : ''}`)
          }}
        >
          Continuar
        </button>
      </div>
    )
  }

  return <P9DDtf advance={advance} />
}

/**
 * Cada aplicação de DTF (frente, costas, etiqueta...) pode ter um tamanho de
 * arte diferente, e o custo do material depende do tamanho de cada uma, não
 * só da primeira. Por isso pede uma medida de largura x altura por aplicação
 * escolhida, em vez de uma medida única pra todas.
 */
function P9DDtf({ advance }: Pick<Props, 'advance'>) {
  const [aplicacoes, setAplicacoes] = useState<number | null>(null)
  const [medidas, setMedidas] = useState<{ largura: string; altura: string }[]>([])

  function escolherAplicacoes(n: number) {
    setAplicacoes(n)
    setMedidas((atual) => {
      const proximo = atual.slice(0, n)
      while (proximo.length < n) proximo.push({ largura: '', altura: '' })
      return proximo
    })
  }

  function setMedida(i: number, campo: 'largura' | 'altura', valor: string) {
    setMedidas((atual) =>
      atual.map((m, idx) => (idx === i ? { ...m, [campo]: valor.replace(/\D/g, '').slice(0, 3) } : m)),
    )
  }

  const parsed = medidas.map((m) => ({
    largura_cm: Number.parseInt(m.largura, 10),
    altura_cm: Number.parseInt(m.altura, 10),
  }))
  const medidasOk =
    !!aplicacoes &&
    parsed.length === aplicacoes &&
    parsed.every((p) => Number.isFinite(p.largura_cm) && p.largura_cm > 0 && Number.isFinite(p.altura_cm) && p.altura_cm > 0)

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!medidasOk) return
        const texto = parsed.map((p) => `${p.largura_cm}x${p.altura_cm}cm`).join(' + ')
        advance(
          {
            aplicacoes,
            aplicacoes_detalhe: parsed,
            estampa_largura_cm: parsed[0].largura_cm,
            estampa_altura_cm: parsed[0].altura_cm,
          },
          texto,
        )
      }}
    >
      <p className="text-sm text-mute">Quantas aplicações (posições diferentes de estampa)?</p>
      <div className="flex flex-wrap gap-2">
        {CONTAGEM_APLICACOES.map((a) => (
          <Chip key={a.valor} active={aplicacoes === a.valor} onClick={() => escolherAplicacoes(a.valor)}>
            {a.label}
          </Chip>
        ))}
      </div>
      {medidas.map((m, i) => (
        <div key={i} className="grid gap-1">
          <p className="text-sm text-mute">Tamanho da aplicação {i + 1} (cm)</p>
          <div className="flex items-center gap-2">
            <input
              className="field flex-1"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Largura"
              value={m.largura}
              onChange={(e) => setMedida(i, 'largura', e.target.value)}
            />
            <span className="text-mute">x</span>
            <input
              className="field flex-1"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Altura"
              value={m.altura}
              onChange={(e) => setMedida(i, 'altura', e.target.value)}
            />
          </div>
        </div>
      ))}
      <button className="btn-primary" disabled={!medidasOk}>
        Continuar
      </button>
    </form>
  )
}

export function P10({ advance }: Props) {
  const [data, setData] = useState(false)
  if (data) {
    return (
      <FreeText
        placeholder="Qual a data do evento ou lançamento?"
        onSubmit={(v) => advance({ prazo_desejado: `Data marcada: ${v}` }, v)}
      />
    )
  }
  return (
    <Options>
      <button className="btn" onClick={() => advance({ prazo_desejado: 'Sem pressa' }, 'Sem pressa')}>
        Sem pressa
      </button>
      <button
        className="btn"
        onClick={() => advance({ prazo_desejado: 'Próximas semanas' }, 'Próximas semanas')}
      >
        Próximas semanas
      </button>
      <button className="btn" onClick={() => setData(true)}>
        Tenho uma data de evento ou lançamento
      </button>
    </Options>
  )
}

export function P11({ advance }: Props) {
  const [nome, setNome] = useState('')
  const [tel, setTel] = useState('')
  const ok = nome.trim().length >= 2 && isValidPhone(tel)

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ok) return
        advance({ nome: nome.trim(), whatsapp: tel }, `${nome.trim()} | ${tel}`)
      }}
    >
      <input
        className="field"
        placeholder="Seu nome"
        autoComplete="name"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <input
        className="field"
        placeholder="(31) 99999-9999"
        inputMode="tel"
        autoComplete="tel"
        value={tel}
        onChange={(e) => setTel(maskPhone(e.target.value))}
      />
      <p className="text-xs text-mute">
        Seus dados servem só pra fechar sua produção, a gente não vende nem compartilha com
        terceiros.
        {env.privacyUrl && (
          <>
            {' '}
            <a
              href={env.privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Política de privacidade
            </a>
            .
          </>
        )}
      </p>
      <button className="btn-primary" disabled={!ok}>
        Continuar
      </button>
    </form>
  )
}

export function P12({ advance }: Props) {
  const [cep, setCep] = useState('')
  const ok = isValidCep(cep)

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ok) return
        advance({ cep_destino: cep }, cep)
      }}
    >
      <input
        className="field"
        placeholder="00000-000"
        inputMode="numeric"
        autoComplete="postal-code"
        value={cep}
        onChange={(e) => setCep(maskCep(e.target.value))}
      />
      <p className="text-xs text-mute">Só pra calcular o frete até você. Nada de spam.</p>
      <button className="btn-primary" disabled={!ok}>
        Calcular meu total
      </button>
    </form>
  )
}
