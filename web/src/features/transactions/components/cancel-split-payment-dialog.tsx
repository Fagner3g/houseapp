import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  getGetSplitDebtSummaryQueryKey,
  getListSplitPaymentsQueryKey,
  getListSplitsQueryKey,
  useCancelSplitPayment,
} from '@/api/generated/api'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getSplitTransactionIdsQueryKey } from '@/features/credit-cards/hooks/use-split-transaction-ids'
import { formatMoneyString } from '@/lib/currency'

import {
  cancelSplitPaymentDialogConfirmLabel,
  cancelSplitPaymentDialogDescription,
  cancelSplitPaymentDialogTitle,
} from '../lib/split-reimbursement-copy'

type CancelSplitPaymentDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  slug: string
  transactionId: string
  splitId: string
  paymentId: string
  amountDisplay: string
  onCanceled?: () => void
}

export function CancelSplitPaymentDialog({
  open,
  onOpenChange,
  slug,
  transactionId,
  splitId,
  paymentId,
  amountDisplay,
  onCanceled,
}: CancelSplitPaymentDialogProps) {
  const queryClient = useQueryClient()
  const { mutateAsync: cancelPayment, isPending } = useCancelSplitPayment()

  const handleConfirm = async () => {
    try {
      await cancelPayment({ slug, transactionId, id: splitId, paymentId })
      queryClient.invalidateQueries({
        queryKey: getListSplitPaymentsQueryKey(slug, transactionId, splitId),
      })
      queryClient.invalidateQueries({ queryKey: getListSplitsQueryKey(slug, transactionId) })
      queryClient.invalidateQueries({
        queryKey: getGetSplitDebtSummaryQueryKey(slug, transactionId),
      })
      queryClient.invalidateQueries({ queryKey: getSplitTransactionIdsQueryKey(slug) })
      toast.success('Pagamento cancelado')
      onOpenChange(false)
      onCanceled?.()
    } catch {
      toast.error('Erro ao cancelar pagamento')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <Undo2 className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl">
                {cancelSplitPaymentDialogTitle()}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                {cancelSplitPaymentDialogDescription()}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <p className="text-sm text-foreground">
          Cancelar o registro de{' '}
          <span className="font-semibold tabular-nums">
            {formatMoneyString(amountDisplay)}
          </span>
          ?
        </p>

        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="w-full sm:w-auto" disabled={isPending}>
            Voltar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async event => {
              event.preventDefault()
              await handleConfirm()
            }}
            className="w-full bg-red-600 hover:bg-red-700 focus:ring-red-600 sm:w-auto"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Cancelando...
              </>
            ) : (
              <>
                <Undo2 className="mr-2 size-4" />
                {cancelSplitPaymentDialogConfirmLabel()}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
