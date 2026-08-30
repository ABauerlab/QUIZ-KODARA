import { useCallback, useEffect, useRef, useState } from 'react'

export interface Msg {
  id: number
  side: 'bot' | 'user'
  text: string
}

const MIN_TYPING = 400
const MAX_TYPING = 800

/**
 * Fila de mensagens com efeito de "digitando". Enquanto a fila drena, a UI de
 * resposta fica escondida, entao a conversa nunca atropela o usuario.
 */
export function useConversation() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [typing, setTyping] = useState(false)
  const [ready, setReady] = useState(false)

  const queue = useRef<string[]>([])
  const draining = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seq = useRef(0)
  const alive = useRef(true)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const drain = useCallback(() => {
    if (draining.current) return
    if (!queue.current.length) {
      setTyping(false)
      setReady(true)
      return
    }
    draining.current = true
    setTyping(true)
    const delay = MIN_TYPING + Math.random() * (MAX_TYPING - MIN_TYPING)
    timer.current = setTimeout(() => {
      if (!alive.current) return
      const text = queue.current.shift()
      draining.current = false
      if (text !== undefined) {
        seq.current += 1
        setMessages((m) => [...m, { id: seq.current, side: 'bot', text }])
      }
      drain()
    }, delay)
  }, [])

  const pushBot = useCallback(
    (texts: string[]) => {
      if (!texts.length) {
        setTyping(false)
        setReady(true)
        return
      }
      queue.current.push(...texts)
      setReady(false)
      drain()
    },
    [drain],
  )

  const pushUser = useCallback((text: string) => {
    seq.current += 1
    setMessages((m) => [...m, { id: seq.current, side: 'user', text }])
    setReady(false)
  }, [])

  return { messages, typing, ready, pushBot, pushUser }
}
