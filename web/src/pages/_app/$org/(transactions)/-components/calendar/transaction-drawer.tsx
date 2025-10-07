import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { useIsMobile } from '@/hooks/use-mobile'
import { TransactionSummary } from '../table-list-transactions/transaction-summary'

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TransactionDrawer({ transaction, open, onOpenChange }: Props) {
  const isMobile = useIsMobile()
  const [messages, setMessages] = useState<string[]>([])
  const [text, setText] = useState('')

  if (!transaction) return null

  const currency = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(transaction.amount)

  const handleSend = () => {
    if (!text.trim()) return
    setMessages(prev => [...prev, text.trim()])
    setText('')
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent
        className={
          isMobile
            ? 'h-[95vh] w-full [&[data-vaul-drawer-direction=bottom]]:!max-h-[95vh] [&[data-vaul-drawer-direction=bottom]]:!h-[95vh] [&[data-vaul-drawer-direction=bottom]]:!min-h-[50vh]'
            : 'h-full w-[450px] max-w-[90vw] [&[data-vaul-drawer-direction=right]]:!max-h-[100vh] [&[data-vaul-drawer-direction=right]]:!h-[100vh]'
        }
        style={{
          maxHeight: isMobile ? '95vh' : '100vh',
          height: isMobile ? '95vh' : '100vh',
          minHeight: isMobile ? '50vh' : 'auto',
          width: isMobile ? '100%' : '450px',
          maxWidth: isMobile ? 'none' : '90vw',
        }}
      >
        <DrawerHeader>
          <DrawerTitle>Resumo da transação</DrawerTitle>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4 overflow-y-auto overflow-x-hidden overscroll-contain">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm">
              <p>
                <span className="font-medium">Título:</span> {transaction.title}
              </p>
              <p>
                <span className="font-medium">Valor:</span> {currency}
              </p>
              <p>
                <span className="font-medium">Vencimento:</span>{' '}
                {format(new Date(transaction.dueDate), "d 'de' MMMM yyyy", { locale: ptBR })}
              </p>
              <p>
                <span className="font-medium">Responsável:</span>{' '}
                {typeof transaction.payTo === 'object'
                  ? transaction.payTo.name || transaction.payTo.email
                  : String(transaction.payTo)}
              </p>
              <div className="flex flex-wrap gap-1">
                {transaction.tags.map(tag => (
                  <Badge
                    key={tag.name}
                    className="bg-muted text-foreground"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          <TransactionSummary transaction={transaction} />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="h-32 overflow-y-auto border rounded-md p-2 text-sm flex flex-col gap-1">
                {messages.length ? (
                  messages.map((m, i) => (
                    <p
                      key={`message-${i}-${m.slice(0, 10)}`}
                      className="bg-muted rounded px-2 py-1 w-fit"
                    >
                      {m}
                    </p>
                  ))
                ) : (
                  <p className="text-muted-foreground">Nenhuma mensagem</p>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                />
                <Button type="button" onClick={handleSend}>
                  Enviar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Fechar</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
