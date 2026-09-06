import { useState } from 'react'

const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'O que é DTF e o que é Silk? Qual a diferença?',
    resposta:
      'Os dois são jeitos de colocar a estampa na peça. DTF é tipo um adesivo especial: a arte é impressa num filme e depois "colada" na peça com calor — funciona bem pra qualquer quantidade, inclusive 1 peça só, e pra artes bem coloridas ou detalhadas. Silk é o processo tradicional de serigrafia: cada cor da estampa passa por uma tela própria — fica mais barato por peça quando o pedido é grande e a arte tem poucas cores, mas exige uma quantidade mínima maior pra compensar.',
  },
  {
    pergunta: 'Qual a diferença entre etiqueta interna e etiqueta bordada?',
    resposta:
      'Etiqueta interna é aquela etiqueta de tecido costurada por dentro da peça, com o nome da sua marca — isso já vem incluso em qualquer pedido, sem custo extra e sem mínimo de quantidade. Etiqueta bordada é um bordado direto na peça (geralmente uma logo pequena) — fica com acabamento mais chique, mas como usa uma máquina de bordado configurada especificamente pro seu desenho, só compensa financeiramente a partir de 1000 unidades. Por isso ela é uma etapa separada, não vem por padrão.',
  },
  {
    pergunta: 'O que é "modelagem própria"? Preciso criar um molde do zero?',
    resposta:
      'Não precisa. Modelagem é o molde/corte da peça (como ela cai no corpo, o caimento, o tamanho de cada parte). A Kodara já tem modelagens prontas, testadas e aprovadas (Oversized, Babylook, Regata, Infantil, Boxy) — você só escolhe qual combina com sua marca. Desenvolver uma modelagem exclusiva do zero é um processo caro e demorado que só grandes marcas fazem; começando agora, usar uma modelagem já pronta é o caminho mais rápido e mais barato pra você vender.',
  },
  {
    pergunta: 'O que é "grade de tamanho"? Como funciona dividir a quantidade?',
    resposta:
      'Se você vai produzir, por exemplo, 40 peças, a grade é como esse total se divide entre os tamanhos (PP, P, M, G, GG, XG, EXG). Por exemplo: 5 PP, 10 P, 15 M, 7 G, 3 GG. Isso depende do público que vai comprar sua peça — se você já vende há um tempo, geralmente sabe quais tamanhos saem mais. Se ainda não sabe, sem problema: dá pra decidir isso junto com a Kodara no WhatsApp, com base no que costuma vender melhor.',
  },
  {
    pergunta: 'Como funciona o prazo de produção?',
    resposta:
      'O prazo começa a contar depois que a proposta é aprovada, o sinal (50%) é pago, a arte final é recebida e todas as informações do pedido estão confirmadas (tamanhos, cores, etc). O prazo exato depende da técnica escolhida e da quantidade — isso é combinado direto no WhatsApp depois do seu briefing aqui no quiz, porque cada produção tem sua fila.',
  },
  {
    pergunta: 'Como funciona o pagamento?',
    resposta:
      'O padrão é 50% no fechamento do pedido (pra entrar na fila de produção) e os outros 50% antes do envio ou retirada. Dá pra pagar via Pix (com desconto) ou parcelar no cartão em até 12x (com a taxa da maquininha repassada). Os valores exatos de cada forma de pagamento são confirmados com você no WhatsApp junto com o restante do orçamento.',
  },
]

export function BotaoDuvida() {
  const [aberto, setAberto] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-panel text-white transition active:scale-90"
        aria-label="Ainda tenho dúvida"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 1.7-2.4 3.2" strokeLinecap="round" />
          <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          onClick={() => setAberto(false)}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-ink p-4 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Ainda tenho dúvida</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-mute active:scale-90"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-3">
              {PERGUNTAS.map((p) => (
                <details key={p.pergunta} className="rounded-2xl border border-line bg-panel p-3">
                  <summary className="cursor-pointer text-sm font-semibold">{p.pergunta}</summary>
                  <p className="mt-2 text-sm text-mute">{p.resposta}</p>
                </details>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-mute">
              Se sua dúvida não tá aqui, pode perguntar direto no WhatsApp quando chegar lá.
            </p>
          </div>
        </div>
      )}
    </>
  )
}
