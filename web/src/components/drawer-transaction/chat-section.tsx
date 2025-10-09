import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageCircle, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { getListChatMessagesQueryKey } from '@/api/generated/api'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useCreateChatMessage, useTransactionChatMessages } from '@/hooks/use-transaction-chat'
import { useAuthStore } from '@/stores/auth'

interface ChatSectionProps {
  transactionId: string
}

export function ChatSection({ transactionId }: ChatSectionProps) {
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()

  const getUserInitials = (user: { name?: string; email: string }) => {
    return user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()
  }

  const { data: chatData, isLoading, error } = useTransactionChatMessages(transactionId, page)
  const createMessageMutation = useCreateChatMessage(transactionId)

  const messages = chatData?.messages || []
  const hasMoreMessages = chatData?.pagination.hasNext || false

  // Invalidar cache quando o chat for aberto para garantir mensagens atualizadas
  useEffect(() => {
    queryClient.invalidateQueries({
      queryKey: getListChatMessagesQueryKey(slug, transactionId),
    })
  }, [queryClient, slug, transactionId])

  // Scroll para o final quando novas mensagens chegarem
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSendMessage = async () => {
    if (!message.trim() || createMessageMutation.isPending) return

    try {
      await createMessageMutation.mutateAsync({
        slug,
        transactionId,
        data: { message: message.trim() },
      })
      setMessage('')
    } catch {
      toast.error('Erro ao enviar mensagem. Tente novamente.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const loadMoreMessages = () => {
    if (hasMoreMessages && !isLoading) {
      setPage(prev => prev + 1)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <MessageCircle className="h-12 w-12 mb-4" />
        <p>Erro ao carregar mensagens do chat</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header do Chat */}
      <div className="border-b p-4 flex-shrink-0">
        <h3 className="font-semibold">Chat da Transação</h3>
        <p className="text-sm text-muted-foreground">
          Converse sobre esta transação com outros membros da organização
        </p>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
          {/* Botão para carregar mais mensagens */}
          {hasMoreMessages && (
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={loadMoreMessages} disabled={isLoading}>
                {isLoading ? 'Carregando...' : 'Carregar mensagens anteriores'}
              </Button>
            </div>
          )}

          {/* Lista de Mensagens */}
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2" />
              <p>Nenhuma mensagem ainda</p>
              <p className="text-sm">Seja o primeiro a comentar!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isOwnMessage = msg.user.id === user?.id

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.user.avatarUrl} />
                    <AvatarFallback>{getUserInitials(msg.user)}</AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex flex-col max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{msg.user.name || msg.user.email}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {isLoading && messages.length === 0 && (
            <div className="flex justify-center py-4">
              <div className="text-muted-foreground">Carregando mensagens...</div>
            </div>
          )}
        </div>
      </div>

      {/* Input de Mensagem */}
      <div className="border-t p-4 flex-shrink-0 bg-background">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua mensagem..."
            disabled={createMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || createMessageMutation.isPending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
