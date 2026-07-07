import { Bot, Loader2, Paperclip, Send, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useListAiProviders } from '@/api/generated/api'
import type { AiChatBodyProvider } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'
import { useDrawerStore } from '@/stores/drawers'

import { ActionPreviewCard } from './action-preview-card'
import { useAiChat } from './use-ai-chat'

export function AiChatPanel() {
  const { slug } = useActiveOrganization()
  const open = useDrawerStore(s => s.aiChatOpen)
  const close = useDrawerStore(s => s.closeAiChat)
  const [input, setInput] = useState('')
  const [provider, setProvider] = useState<AiChatBodyProvider | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: providersData } = useListAiProviders(slug, {
    query: { enabled: !!slug && open },
  })

  const {
    timeline,
    isStreaming,
    error,
    sendMessage,
    confirmAction,
    rejectAction,
    stopStreaming,
    clearChat,
  } = useAiChat(slug)

  useEffect(() => {
    if (open && providersData?.providers?.length && !provider) {
      setProvider(providersData.providers[0].name)
    }
  }, [open, providersData, provider])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [timeline, isStreaming])

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await sendMessage(text, provider)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  const handleFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setInput(prev => `${prev}\nAnexei o arquivo: ${file.name}`.trim())
      return
    }

    if (file.size > 512_000) {
      setInput(prev =>
        `${prev}\nTenho um PDF "${file.name}" para importar como fatura.`.trim()
      )
      return
    }

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!)
    }
    const base64 = btoa(binary)
    setInput(prev =>
      `${prev}\n[PDF:${file.name}]\n${base64}`.trim()
    )
  }

  return (
    <Sheet open={open} onOpenChange={v => !v && close()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between gap-2 pr-8">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-violet-600" />
              Assistente IA
            </SheetTitle>
            <Button variant="ghost" size="icon" onClick={clearChat} aria-label="Limpar chat">
              <Trash2 className="size-4" />
            </Button>
          </div>
          {providersData?.providers?.length ? (
            <Select
              value={provider}
              onValueChange={v => setProvider(v as AiChatBodyProvider)}
            >
              <SelectTrigger className="mt-2 h-9">
                <SelectValue placeholder="Provedor" />
              </SelectTrigger>
              <SelectContent>
                {providersData.providers.map(p => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!timeline.length && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-slate-500">
              <Bot className="size-10 text-slate-300" />
              <p className="text-sm">
                Pergunte sobre suas finanças ou peça para criar lançamentos, divisões e importar
                faturas.
              </p>
            </div>
          )}

          {timeline.map(entry =>
            entry.kind === 'message' ? (
              <div
                key={entry.item.id}
                className={cn(
                  'max-w-[90%] rounded-lg px-4 py-2.5 text-sm',
                  entry.item.role === 'user'
                    ? 'ml-auto bg-slate-900 text-white'
                    : 'mr-auto border border-slate-200 bg-white text-slate-800'
                )}
              >
                <p className="whitespace-pre-wrap break-words">
                  {entry.item.content || (isStreaming ? '…' : '')}
                </p>
              </div>
            ) : (
              <ActionPreviewCard
                key={entry.item.id}
                item={entry.item}
                onConfirm={confirmAction}
                onReject={rejectAction}
                onEdit={(_, message) => void sendMessage(message, provider)}
              />
            )
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,application/pdf"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
                e.target.value = ''
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Anexar PDF"
            >
              <Paperclip className="size-4" />
            </Button>
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              rows={2}
              className="min-h-0 resize-none"
              disabled={isStreaming}
            />
            {isStreaming ? (
              <Button type="button" variant="outline" size="icon" onClick={stopStreaming}>
                <Loader2 className="size-4 animate-spin" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                className="bg-slate-900"
                disabled={!input.trim()}
                onClick={() => void handleSend()}
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
