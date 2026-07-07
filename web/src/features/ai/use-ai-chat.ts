import { useCallback, useRef, useState } from 'react'

import {
  confirmAiAction,
  rejectAiAction,
} from '@/api/generated/api'
import type { AiChatBodyProvider } from '@/api/generated/model'
import { getAuthToken } from '@/lib/auth'
import { env } from '@/lib/env'

export type AiChatHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiSseTextEvent = {
  type: 'text'
  chunk: string
}

export type AiSseActionPreviewEvent = {
  type: 'action_preview'
  action: string
  actionId: string
  data: Record<string, unknown>
  message: string
}

export type AiSseErrorEvent = {
  type: 'error'
  message: string
}

export type AiSseEvent = AiSseTextEvent | AiSseActionPreviewEvent | AiSseErrorEvent

export type ChatMessageItem = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type ActionPreviewItem = {
  id: string
  actionId: string
  action: string
  data: Record<string, unknown>
  message: string
  status: 'pending' | 'confirmed' | 'rejected'
}

export type ChatTimelineItem =
  | { kind: 'message'; item: ChatMessageItem }
  | { kind: 'action'; item: ActionPreviewItem }

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function streamAiChat(
  slug: string,
  body: {
    message: string
    history?: AiChatHistoryMessage[]
    provider?: AiChatBodyProvider
  },
  onEvent: (event: AiSseEvent) => void,
  signal?: AbortSignal
) {
  const token = getAuthToken()
  const url = new URL(`/organizations/${slug}/ai/chat`, env?.VITE_API_HOST)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw new Error('Erro ao conectar com o assistente')
  }

  if (!response.body) {
    throw new Error('Resposta vazia do assistente')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return

      try {
        onEvent(JSON.parse(payload) as AiSseEvent)
      } catch {
        // ignore malformed chunks
      }
    }
  }
}

export function useAiChat(slug: string) {
  const [timeline, setTimeline] = useState<ChatTimelineItem[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (message: string, provider?: AiChatBodyProvider) => {
      if (!slug || !message.trim() || isStreaming) return

      const priorHistory: AiChatHistoryMessage[] = timeline
        .filter(
          (entry): entry is { kind: 'message'; item: ChatMessageItem } =>
            entry.kind === 'message' && entry.item.content.trim().length > 0
        )
        .map(entry => ({ role: entry.item.role, content: entry.item.content }))

      setError(null)
      setIsStreaming(true)

      const userItem: ChatMessageItem = { id: createId(), role: 'user', content: message.trim() }
      const assistantItem: ChatMessageItem = { id: createId(), role: 'assistant', content: '' }

      setTimeline(prev => [
        ...prev,
        { kind: 'message', item: userItem },
        { kind: 'message', item: assistantItem },
      ])

      const controller = new AbortController()
      abortRef.current = controller

      try {
        await streamAiChat(
          slug,
          {
            message: message.trim(),
            history: priorHistory,
            provider,
          },
          event => {
            if (event.type === 'text') {
              setTimeline(prev =>
                prev.map(entry =>
                  entry.kind === 'message' && entry.item.id === assistantItem.id
                    ? {
                        ...entry,
                        item: {
                          ...entry.item,
                          content: entry.item.content + event.chunk,
                        },
                      }
                    : entry
                )
              )
              return
            }

            if (event.type === 'action_preview') {
              setTimeline(prev => [
                ...prev,
                {
                  kind: 'action',
                  item: {
                    id: createId(),
                    actionId: event.actionId,
                    action: event.action,
                    data: event.data,
                    message: event.message,
                    status: 'pending',
                  },
                },
              ])
              return
            }

            if (event.type === 'error') {
              setError(event.message)
            }
          },
          controller.signal
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem')
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [slug, isStreaming, timeline]
  )

  const confirmAction = useCallback(
    async (actionId: string) => {
      if (!slug) return
      await confirmAiAction(slug, { actionId })
      setTimeline(prev =>
        prev.map(entry =>
          entry.kind === 'action' && entry.item.actionId === actionId
            ? { ...entry, item: { ...entry.item, status: 'confirmed' } }
            : entry
        )
      )
    },
    [slug]
  )

  const rejectAction = useCallback(
    async (actionId: string) => {
      if (!slug) return
      await rejectAiAction(slug, { actionId })
      setTimeline(prev =>
        prev.map(entry =>
          entry.kind === 'action' && entry.item.actionId === actionId
            ? { ...entry, item: { ...entry.item, status: 'rejected' } }
            : entry
        )
      )
    },
    [slug]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
  }, [])

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    setTimeline([])
    setError(null)
    setIsStreaming(false)
  }, [])

  return {
    timeline,
    isStreaming,
    error,
    sendMessage,
    confirmAction,
    rejectAction,
    stopStreaming,
    clearChat,
  }
}
