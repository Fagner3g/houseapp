import { useCallback, useState } from 'react'

import { getAuthToken } from '@/lib/auth'
import { env } from '@/lib/env'

export type ProviderName = 'groq' | 'gemini' | 'deepseek'

export interface AiProvider {
  name: ProviderName
  label: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string // data URL, apenas para exibição em mensagens do usuário
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function fetchAvailableProviders(): Promise<AiProvider[]> {
  const token = getAuthToken()
  const res = await fetch(new URL('/me/investments/ai/providers', env.VITE_API_HOST), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.providers ?? []
}

async function* streamChat(
  message: string,
  provider: ProviderName,
  history: ChatMessage[],
  image?: string
): AsyncGenerator<string> {
  const token = getAuthToken()
  // Remove imagens do histórico para não sobrecarregar o payload
  const cleanHistory = history.map(({ image: _img, id: _id, ...m }) => m)
  const res = await fetch(new URL('/me/investments/ai/chat', env.VITE_API_HOST), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, provider, history: cleanHistory, image }),
  })

  if (!res.ok) {
    throw new Error(`Erro ${res.status}: ${await res.text()}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('Stream não disponível')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.chunk) yield parsed.chunk
      } catch (e) {
        if (e instanceof SyntaxError) continue
        throw e
      }
    }
  }
}

export function useInvestmentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<ProviderName | null>(null)
  const [providersLoaded, setProvidersLoaded] = useState(false)

  const loadProviders = useCallback(async () => {
    if (providersLoaded) return
    const list = await fetchAvailableProviders()
    setProviders(list)
    if (list.length > 0 && !selectedProvider) setSelectedProvider(list[0].name)
    setProvidersLoaded(true)
  }, [providersLoaded, selectedProvider])

  const sendMessage = useCallback(
    async (text: string, image?: string) => {
      if (!selectedProvider || isStreaming) return

      const userMsg: ChatMessage = { id: makeId(), role: 'user', content: text, image }
      const history = [...messages, userMsg]
      setMessages(history)
      setIsStreaming(true)

      // Adiciona placeholder para a resposta da IA
      setMessages(prev => [...prev, { id: makeId(), role: 'assistant', content: '' }])

      try {
        for await (const chunk of streamChat(text, selectedProvider, messages, image)) {
          setMessages(prev => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: last.content + chunk }
            }
            return updated
          })
        }
      } catch (error) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: `Erro ao obter resposta: ${String(error)}`,
          }
          return updated
        })
      } finally {
        setIsStreaming(false)
      }
    },
    [messages, selectedProvider, isStreaming]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  return {
    messages,
    isStreaming,
    providers,
    selectedProvider,
    setSelectedProvider,
    loadProviders,
    sendMessage,
    clearMessages,
  }
}
