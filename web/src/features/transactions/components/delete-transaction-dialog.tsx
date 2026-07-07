import { useQueryClient } from '@tanstack/react-query'
import { Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  getListAccountsQueryKey,
  getListTransactionsQueryKey,
  useDeleteTransaction,
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
import { formatCentsString } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'

type DeleteTransactionTarget = {
  id: string
  title: string
  amount: string | null
  transferPairId?: string | null
}

interface DeleteTransactionDialogProps {
  transaction: DeleteTransactionTarget | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
  onDeleted,
}: DeleteTransactionDialogProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const { mutateAsync: deleteTransaction, isPending } = useDeleteTransaction()

  const handleConfirm = async () => {
    if (!slug || !transaction) return

    try {
      await deleteTransaction({ slug, id: transaction.id })
      await queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
      await queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
      toast.success('Lançamento excluído')
      onOpenChange(false)
      onDeleted?.()
    } catch {
      toast.error('Erro ao excluir lançamento')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-red-100">
              <Trash2 className="size-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-xl">Excluir lançamento</AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {transaction && (
          <div className="space-y-2 text-sm text-foreground">
            <p>
              Excluir <span className="font-semibold">{transaction.title}</span>
              {transaction.amount ? (
                <>
                  {' '}
                  (<span className="tabular-nums">{formatCentsString(transaction.amount)}</span>)
                </>
              ) : null}
              ?
            </p>
            {transaction.transferPairId && (
              <p className="text-muted-foreground">
                O lançamento pareado na outra conta também será removido.
              </p>
            )}
          </div>
        )}

        <AlertDialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="w-full sm:w-auto" disabled={isPending}>
            Cancelar
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
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 size-4" />
                Excluir
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
