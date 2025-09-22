import dayjs from 'dayjs'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// CSS para animação suave
const animationStyles = `
  @keyframes slideInDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`

// Injetar estilos no head se não existirem
if (typeof document !== 'undefined' && !document.getElementById('payment-timeline-animations')) {
  const style = document.createElement('style')
  style.id = 'payment-timeline-animations'
  style.textContent = animationStyles
  document.head.appendChild(style)
}

interface Props {
  transaction: ListTransactions200TransactionsItem
}

// Função para gerar dados do cronograma de pagamentos
function generatePaymentTimelineData(transaction: ListTransactions200TransactionsItem) {
  const installmentsTotal = transaction.installmentsTotal || 1
  const installmentsPaid = transaction.installmentsPaid || 0
  const dueDate = dayjs(transaction.dueDate)

  // Se é uma transação única, retorna apenas um item
  if (installmentsTotal === 1) {
    const isPaid = transaction.status === 'paid'

    // Sempre mostrar a data de pagamento se estiver paga e tiver paidAt
    const displayDate =
      isPaid && transaction.paidAt
        ? dayjs(transaction.paidAt).format('DD/MM/YYYY')
        : dueDate.format('DD/MM/YYYY')

    return [
      {
        month: dueDate.format('MMM/YY'),
        fullDate: displayDate,
        status: isPaid ? 'paid' : 'pending',
        installment: 1,
        total: 1,
        paidDate: transaction.paidAt ? dayjs(transaction.paidAt).format('DD/MM/YYYY') : null,
      },
    ]
  }

  // Para transações recorrentes, gerar cronograma
  const timelineData = []

  for (let i = 0; i < installmentsTotal; i++) {
    const installmentDate = dueDate.add(i, 'month')
    const isPaid = i < installmentsPaid

    // O número da parcela é simplesmente a posição na sequência (i + 1)
    // Parcela 1 = primeira parcela, Parcela 2 = segunda parcela, etc.
    const installmentNumber = i + 1

    // Para transações recorrentes, não temos a data de pagamento individual
    // Apenas sabemos se está paga ou não baseado no installmentsPaid
    const paidDate = null // Não mostrar data para transações recorrentes

    timelineData.push({
      month: installmentDate.format('MMM/YY'),
      fullDate: installmentDate.format('DD/MM/YYYY'),
      status: isPaid ? 'paid' : 'pending',
      installment: installmentNumber,
      total: installmentsTotal,
      paidDate,
    })
  }

  return timelineData
}

export function PaymentTimelineChart({ transaction }: Props) {
  const timelineData = generatePaymentTimelineData(transaction)
  const [isExpanded, setIsExpanded] = useState(false)

  // Encontrar o índice do último pagamento
  const lastPaidIndex = timelineData.findLastIndex(entry => entry.status === 'paid')

  // Calcular quantos itens mostrar por padrão (último pago + 2 seguintes)
  const defaultVisibleCount = lastPaidIndex >= 0 ? lastPaidIndex + 3 : 2

  // Determinar quais itens mostrar
  const visibleItems = isExpanded
    ? timelineData
    : timelineData.slice(0, Math.min(defaultVisibleCount, timelineData.length))

  const hasMoreItems = timelineData.length > visibleItems.length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Cronograma de Pagamentos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Barra de Progresso */}
        <div className="rounded bg-muted/50 p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso:</span>
            <span className="font-medium">
              {timelineData.filter(entry => entry.status === 'paid').length} de{' '}
              {timelineData.length} parcelas
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-green-500 transition-all duration-300"
              style={{
                width: `${(timelineData.filter(entry => entry.status === 'paid').length / timelineData.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Lista de parcelas */}
        <div className="space-y-1 overflow-hidden transition-all duration-300 ease-in-out">
          {visibleItems.map((entry, index) => (
            <div
              key={`parcel-${entry.installment}`}
              className={`flex items-center justify-between rounded border p-2 transition-all duration-300 ease-in-out ${
                entry.status === 'paid'
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                animation: isExpanded ? 'slideInDown 0.3s ease-out forwards' : 'none',
              }}
            >
              {/* Lado esquerdo - Informações da parcela */}
              <div className="flex items-center gap-2">
                {/* Indicador de status */}
                <div
                  className={`h-2 w-2 rounded-full ${
                    entry.status === 'paid' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />

                {/* Informações */}
                <div>
                  <div className="text-sm font-medium">
                    Parcela {entry.installment} de {entry.total}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.month} • {entry.fullDate}
                  </div>
                </div>
              </div>

              {/* Lado direito - Status */}
              <Badge
                variant={entry.status === 'paid' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {entry.status === 'paid' ? 'Pago' : 'Pendente'}
              </Badge>
            </div>
          ))}
        </div>

        {/* Botão Ver Mais/Menos */}
        {hasMoreItems && (
          <div className="flex justify-center pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Ver menos
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Ver mais ({timelineData.length - visibleItems.length} restantes)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
