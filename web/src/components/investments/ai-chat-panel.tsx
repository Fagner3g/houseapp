import { Bot, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'

import { type ProviderName, useInvestmentChat } from '@/features/investments/ai-chat'

/** Converte ++texto++ / --texto-- / ~~texto~~ em spans coloridos antes do markdown */
function colorizeTokens(text: string): string {
  return text
    .replace(/\+\+(.+?)\+\+/g, '<span class="text-emerald-400 font-medium">$1</span>')
    .replace(/--(.+?)--/g, '<span class="text-rose-400 font-medium">$1</span>')
    .replace(/~~(.+?)~~/g, '<span class="text-amber-400 font-medium">$1</span>')
}

const PROVIDER_LABELS: Record<ProviderName, string> = {
  groq: 'Groq',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
}

const SUGGESTIONS = [
  { label: 'Como está minha carteira?', emoji: '📊' },
  { label: 'Estou no lucro ou prejuízo?', emoji: '📈' },
  { label: 'Gere um relatório mensal', emoji: '📋' },
  { label: 'Qual ativo tem melhor rendimento?', emoji: '🏆' },
]

export function AiChatPanel() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    messages,
    isStreaming,
    providers,
    selectedProvider,
    setSelectedProvider,
    loadProviders,
    sendMessage,
    clearMessages,
  } = useInvestmentChat()

  useEffect(() => {
    if (open) {
      loadProviders()
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open, loadProviders])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  })

  async function handleSend() {
    const text = input.trim() || (pendingImage ? 'O que você vê nesta imagem? Relacione com minha carteira se possível.' : '')
    if (!text || isStreaming) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    const img = pendingImage ?? undefined
    setPendingImage(null)
    await sendMessage(text, img)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setPendingImage(reader.result as string)
        reader.readAsDataURL(file)
        return
      }
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(o => !o)}
        type="button"
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg shadow-primary/20 transition-all duration-200 hover:scale-105 hover:shadow-primary/30 sm:bottom-6 sm:right-6 ${
          open
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary text-primary-foreground'
        }`}
      >
        {open ? <X className="size-4" /> : <Sparkles className="size-4" />}
        {open ? 'Fechar' : 'Assistente IA'}
      </button>

      {/* Painel */}
      {open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col overflow-hidden border-t border-border/60 bg-background shadow-2xl shadow-black/40 sm:bottom-[4.5rem] sm:left-auto sm:right-6 sm:w-[420px] sm:rounded-2xl sm:border"
          style={{ height: 'min(85dvh, 620px)' }}
        >
          {/* Drag handle (mobile) */}
          <div className="flex justify-center pt-2 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header com gradiente */}
          <div className="relative flex items-center justify-between overflow-hidden border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-full bg-primary/15">
                <Bot className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">Assistente IA</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {isStreaming ? (
                    <span className="text-primary">Digitando…</span>
                  ) : (
                    'Carteira conectada'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {providers.length > 0 && (
                <select
                  value={selectedProvider ?? ''}
                  onChange={e => setSelectedProvider(e.target.value as ProviderName)}
                  className="rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-xs text-foreground outline-none transition-colors hover:border-primary/40"
                >
                  {providers.map(p => (
                    <option key={p.name} value={p.name}>
                      {PROVIDER_LABELS[p.name] ?? p.name}
                    </option>
                  ))}
                </select>
              )}
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  title="Limpar conversa"
                  type="button"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                type="button"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-5 px-2 text-center">
                <div className="relative">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="size-7 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 size-4 rounded-full bg-emerald-500 ring-2 ring-background" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">Olá! Sou seu assistente financeiro.</p>
                  <p className="text-xs text-muted-foreground">
                    Tenho acesso completo à sua carteira. Pergunte o que quiser.
                  </p>
                </div>
                <div className="grid w-full grid-cols-2 gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.label)}
                      className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-left text-xs text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                      type="button"
                    >
                      <span className="mt-px text-sm leading-none">{s.emoji}</span>
                      <span className="leading-snug">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar IA */}
                  {msg.role === 'assistant' && (
                    <div className="mb-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Bot className="size-3.5 text-primary" />
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : 'rounded-bl-sm border border-border/40 bg-muted/50 text-foreground'
                    }`}
                  >
                    {msg.image && (
                      <img
                        src={msg.image}
                        alt="imagem anexada"
                        className="mb-2 max-h-48 w-full rounded-lg object-cover"
                      />
                    )}
                    {!msg.content && msg.role === 'assistant' ? (
                      <span className="flex gap-1 py-0.5">
                        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:0ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:150ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:300ms]" />
                      </span>
                    ) : msg.role === 'assistant' ? (
                      <ReactMarkdown
                        rehypePlugins={[rehypeRaw]}
                        components={{
                          h1: ({ children }) => <h1 className="mb-2 mt-3 text-base font-bold first:mt-0">{children}</h1>,
                          h2: ({ children }) => <h2 className="mb-1 mt-3 text-sm font-bold first:mt-0">{children}</h2>,
                          h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-semibold">{children}</h3>,
                          p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 space-y-0.5 pl-4 last:mb-0">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-4 last:mb-0">{children}</ol>,
                          li: ({ children }) => <li className="list-disc">{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          table: ({ children }) => (
                            <div className="my-2 overflow-x-auto rounded-lg border border-border/40">
                              <table className="w-full text-xs">{children}</table>
                            </div>
                          ),
                          thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
                          th: ({ children }) => <th className="px-2 py-1.5 text-left font-semibold">{children}</th>,
                          td: ({ children }) => <td className="border-t border-border/30 px-2 py-1.5">{children}</td>,
                          code: ({ children }) => <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-xs">{children}</code>,
                          hr: () => <hr className="my-2 border-border/40" />,
                        }}
                      >
                        {colorizeTokens(msg.content)}
                      </ReactMarkdown>
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/60 bg-background/80 p-3">
            {providers.length === 0 && (
              <p className="mb-2 text-center text-xs text-amber-500">
                Nenhum provedor configurado. Adicione uma API key no servidor.
              </p>
            )}

            {/* Preview da imagem colada */}
            {pendingImage && (
              <div className="relative mb-2 inline-block">
                <img
                  src={pendingImage}
                  alt="imagem a enviar"
                  className="max-h-24 rounded-lg border border-border/60 object-cover"
                />
                <button
                  onClick={() => setPendingImage(null)}
                  type="button"
                  className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-background border border-border/60 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-border/50 bg-muted/20 px-3 py-2 transition-all focus-within:border-primary/60 focus-within:bg-muted/30 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => {
                  setInput(e.target.value)
                  e.target.style.height = 'auto'
                  e.target.style.height = `${e.target.scrollHeight}px`
                }}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={pendingImage ? 'Comente sobre a imagem…' : 'Pergunte sobre sua carteira…'}
                rows={1}
                disabled={isStreaming || providers.length === 0}
                className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
              <button
                onClick={handleSend}
                disabled={(!input.trim() && !pendingImage) || isStreaming || providers.length === 0}
                type="button"
                className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Send className="size-3.5" />
              </button>
            </div>
            <p className="mt-2 hidden text-center text-[10px] text-muted-foreground/40 sm:block">
              Enter para enviar · Shift+Enter para nova linha · Cole imagens com Ctrl+V
            </p>
          </div>
        </div>
      )}
    </>
  )
}
