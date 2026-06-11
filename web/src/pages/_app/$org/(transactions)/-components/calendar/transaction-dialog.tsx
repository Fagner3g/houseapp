import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

import type { ListTransactions200TransactionsItem } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatPartialPaymentStatusCompact } from '@/lib/currency'
import { cn } from '@/lib/utils'
import {
  getInstallmentProgress,
  getTransactionStatusBadgeVariant,
  getTransactionStatusLabel,
  getTransactionStatusLine,
} from '@/lib/transaction-status'
import { PaymentDateDialog } from '../table-list-transactions/payment-date-dialog'

interface Props {
  transaction: ListTransactions200TransactionsItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEditTransaction?: (transaction: ListTransactions200TransactionsItem) => void
}

function getPayToName(payTo: ListTransactions200TransactionsItem['payTo']): string {
  if (typeof payTo === 'object' && payTo) {
    return payTo.name || payTo.email
  }
  return String(payTo)
}

export function TransactionCalendarDialog({
  transaction,
  open,
  onOpenChange,
  onEditTransaction,
}: Props) {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)

  if (!transaction) return null

  const status = transaction.status
  const showPayAction = status === 'pending' || status === 'partial' || status === 'paid'
  const payButtonLabel =
    status === 'paid'
      ? 'Cancelar pagamento'
      : status === 'partial'
        ? 'Continuar pagamento'
        : 'Marcar como pago'

  const installmentProgress = getInstallmentProgress(transaction)
  const visibleTags = transaction.tags.slice(0, 3)
  const hiddenTagsCount = Math.max(0, transaction.tags.length - 3)

  const handleEdit = () => {
    onOpenChange(false)
    onEditTransaction?.(transaction)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span className="min-w-0">{transaction.title}</span>
              <Badge variant={getTransactionStatusBadgeVariant(transaction)}>
                {getTransactionStatusLabel(transaction)}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-2 text-sm">
            <p>
              <span className="font-medium">Valor:</span>{' '}
              {formatCurrency(Number(transaction.amount))}
              {status === 'partial' && transaction.valuePaid != null && (
                <span className="text-amber-600 dark:text-amber-400">
                  {' '}
                  (
                  {formatPartialPaymentStatusCompact(
                    Number(transaction.amount),
                    transaction.valuePaid
                  )}
                  )
                </span>
              )}
            </p>
            <p>
              <span className="font-medium">Vencimento:</span>{' '}
              {format(new Date(transaction.dueDate), "d 'de' MMMM yyyy", { locale: ptBR })}
            </p>
            <p>
              <span className="font-medium">Responsável:</span> {getPayToName(transaction.payTo)}
            </p>
            {transaction.installmentIndex != null && transaction.installmentsTotal != null && (
              <p>
                <span className="font-medium">Parcela:</span> {transaction.installmentIndex} de{' '}
                {transaction.installmentsTotal}
              </p>
            )}
            {visibleTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                <span className="font-medium">Tags:</span>
                {visibleTags.map(tag => (
                  <Badge
                    key={tag.name}
                    className="text-foreground"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
                {hiddenTagsCount > 0 && (
                  <span className="text-xs text-muted-foreground">+{hiddenTagsCount}</span>
                )}
              </div>
            )}
            <p className="text-muted-foreground">{getTransactionStatusLine(transaction)}</p>
          </div>

          {installmentProgress?.show && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">
                {installmentProgress.paid} de {installmentProgress.total} pagas
              </p>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (installmentProgress.paid / installmentProgress.total) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
            {showPayAction && (
              <Button
                type="button"
                onClick={() => setPaymentDialogOpen(true)}
                variant={status === 'paid' ? 'outline' : 'default'}
                className={cn('w-full', status === 'paid' && 'text-destructive hover:text-destructive')}
              >
                {payButtonLabel}
              </Button>
            )}
            {onEditTransaction && (
              <Button type="button" variant="outline" onClick={handleEdit} className="w-full">
                Editar transação
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDateDialog
        transaction={transaction}
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSuccess={() => onOpenChange(false)}
      />
    </>
  )
}
