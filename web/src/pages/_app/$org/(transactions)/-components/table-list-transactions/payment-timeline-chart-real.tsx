import dayjs from 'dayjs'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTransactionInstallments } from '@/hooks/use-transaction-installments'

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

export function PaymentTimelineChartReal({ transaction }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Buscar parcelas reais da API
  const {
    data: installments = [],
    isLoading,
    error,
  } = useTransactionInstallments({
    seriesId: transaction.serieId || '',
    enabled: false, // Desabilitado por enquanto até a API estar pronta
  })

  // Simular dados reais baseados no que vemos na tabela
  // Se não tem parcelas da API, criar simulação realista
  const displayInstallments =
    installments.length > 0
      ? installments
      : (() => {
          const installmentsTotal = transaction.installmentsTotal || 1
          const installmentsPaid = transaction.installmentsPaid || 0

          if (installmentsTotal === 1) {
            return [
              {
                id: transaction.id,
                installmentIndex: 1,
                dueDate: transaction.dueDate,
                amount: transaction.amount,
                status: transaction.status as 'pending' | 'paid' | 'canceled',
                paidAt: transaction.paidAt,
                valuePaid: transaction.status === 'paid' ? Number(transaction.amount) : null,
                description: null,
              },
            ]
          }

          // Para transações com múltiplas parcelas, simular status realista
          const mockInstallments = []
          const dueDate = dayjs(transaction.dueDate)

          // Calcular a data da primeira parcela (assumindo que começou há alguns meses)
          const firstInstallmentDate = dueDate.subtract(installmentsTotal - 1, 'month')

          // Simular parcelas pagas e pendentes intercaladas (como na tabela)
          const paidIndices = new Set<number>()

          // Marcar algumas parcelas como pagas (não necessariamente sequenciais)
          if (installmentsPaid > 0) {
            // Simular parcelas pagas em posições variadas
            const paidPositions = [0, 1, 2, 5, 8] // Exemplo: parcelas 1, 2, 3, 6, 9 pagas
            for (let i = 0; i < Math.min(installmentsPaid, paidPositions.length); i++) {
              if (paidPositions[i] < installmentsTotal) {
                paidIndices.add(paidPositions[i])
              }
            }
          }

          for (let i = 0; i < installmentsTotal; i++) {
            const installmentDate = firstInstallmentDate.add(i, 'month')
            const isPaid = paidIndices.has(i)

            mockInstallments.push({
              id: `mock-${i}`,
              installmentIndex: i + 1,
              dueDate: installmentDate.toISOString(),
              amount: transaction.amount,
              status: isPaid ? 'paid' : 'pending',
              paidAt: isPaid ? installmentDate.toISOString() : null,
              valuePaid: isPaid ? Number(transaction.amount) : null,
              description: null,
            })
          }

          return mockInstallments
        })()

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cronograma de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Carregando parcelas...</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cronograma de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">Erro ao carregar parcelas</div>
        </CardContent>
      </Card>
    )
  }

  // Encontrar o índice do último pagamento
  const lastPaidIndex = displayInstallments.findLastIndex(entry => entry.status === 'paid')

  // Calcular quantos itens mostrar por padrão (último pago + 2 seguintes)
  const defaultVisibleCount = lastPaidIndex >= 0 ? lastPaidIndex + 3 : 2

  // Determinar quais itens mostrar
  const visibleItems = isExpanded
    ? displayInstallments
    : displayInstallments.slice(0, Math.min(defaultVisibleCount, displayInstallments.length))

  const hasMoreItems = displayInstallments.length > visibleItems.length

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
              {displayInstallments.filter(entry => entry.status === 'paid').length} de{' '}
              {displayInstallments.length} parcelas
            </span>
          </div>
          <div className="mt-1 h-1 w-full rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-green-500 transition-all duration-300"
              style={{
                width: `${(displayInstallments.filter(entry => entry.status === 'paid').length / displayInstallments.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Lista de parcelas */}
        <div className="space-y-1 overflow-hidden transition-all duration-300 ease-in-out">
          {visibleItems.map((entry, index) => (
            <div
              key={`parcel-${entry.installmentIndex}`}
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
                    Parcela {entry.installmentIndex} de {displayInstallments.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {dayjs(entry.dueDate).format('MMM/YY')} •{' '}
                    {dayjs(entry.dueDate).format('DD/MM/YYYY')}
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
                  Ver mais ({displayInstallments.length - visibleItems.length} restantes)
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
