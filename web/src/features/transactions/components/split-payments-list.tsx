import dayjs from 'dayjs'
import { useState } from 'react'

import { useListSplitPayments } from '@/api/generated/api'
import type { ListSplitPayments200PaymentsItemMethod } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import { formatMoneyString } from '@/lib/currency'
import { Loader2 } from 'lucide-react'

import { CancelSplitPaymentDialog } from './cancel-split-payment-dialog'

const METHOD_LABELS: Record<NonNullable<ListSplitPayments200PaymentsItemMethod>, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  other: 'Outro',
}

interface SplitPaymentsListProps {
  slug: string
  transactionId: string
  splitId: string
  canCancel?: boolean
}

export function SplitPaymentsList({
  slug,
  transactionId,
  splitId,
  canCancel = false,
}: SplitPaymentsListProps) {
  const [cancelTarget, setCancelTarget] = useState<{
    paymentId: string
    amount: string
  } | null>(null)

  const { data, isLoading } = useListSplitPayments(slug, transactionId, splitId, {
    query: { enabled: !!slug && !!transactionId && !!splitId },
  })

  const payments = data?.payments ?? []

  if (isLoading) {
    return (
      <div className="mt-2 flex items-center gap-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
        <Loader2 className="size-3 animate-spin" />
        Carregando pagamentos...
      </div>
    )
  }

  if (!payments.length) return null

  return (
    <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Pagamentos registrados
      </p>
      <ul className="space-y-1">
        {payments.map(payment => (
          <li
            key={payment.id}
            className="flex items-center justify-between gap-2 rounded-md bg-white/80 px-2 py-1.5 text-sm"
          >
            <div className="min-w-0">
              <span className="font-medium tabular-nums text-slate-800">
                {formatMoneyString(payment.amount)}
              </span>
              <span className="ml-2 text-xs text-slate-500">
                {dayjs(payment.paidAt).format('DD/MM/YYYY')}
              </span>
              {payment.method && (
                <span className="ml-1 text-xs text-slate-400">
                  · {METHOD_LABELS[payment.method]}
                </span>
              )}
            </div>
            {canCancel && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={() =>
                  setCancelTarget({ paymentId: payment.id, amount: payment.amount })
                }
              >
                Cancelar
              </Button>
            )}
          </li>
        ))}
      </ul>

      {cancelTarget && (
        <CancelSplitPaymentDialog
          open
          onOpenChange={open => {
            if (!open) setCancelTarget(null)
          }}
          slug={slug}
          transactionId={transactionId}
          splitId={splitId}
          paymentId={cancelTarget.paymentId}
          amountDisplay={cancelTarget.amount}
        />
      )}
    </div>
  )
}
