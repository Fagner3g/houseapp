import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getGetRecurringTransactionQueryKey,
  getListRecurringTransactionsQueryKey,
  useGetRecurringTransaction,
  usePreviewUpdateRecurringTransaction,
  useUpdateRecurringTransaction,
  useListAccounts,
} from '@/api/generated/api'
import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerNestedRoot,
  DrawerTitle,
} from '@/components/ui/drawer'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { centsStringToNumber, formatCurrency } from '@/lib/currency'
import {
  stackyDrawerCloseButton,
  stackyDrawerContent,
  stackyDrawerContentNested,
  stackyDrawerHeader,
  stackyDrawerOverlay,
  stackyDrawerTitle,
} from '@/lib/ui-classes'
import { useDrawerStore } from '@/stores/drawers'

import { RecurringContractForm } from './recurring-contract-form'
import {
  buildRecurringUpdatePayload,
  type ContractFormValues,
} from '../lib/recurring-contract-form'

export function RecurringContractDrawer({ nested = false }: { nested?: boolean }) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const open = useDrawerStore(s => s.recurringContractDrawerOpen)
  const recurringId = useDrawerStore(s => s.editingRecurringId)
  const transactionOpen = useDrawerStore(s => s.transactionDrawerOpen)
  const close = useDrawerStore(s => s.closeRecurringContractDrawer)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<ContractFormValues | null>(null)
  const [impactPreview, setImpactPreview] = useState<{
    preservedPastCount: number
    updatedFuturePendingCount: number
    currentAmount: string
    proposedAmount: string
  } | null>(null)

  const { data: recurringData, isLoading } = useGetRecurringTransaction(slug, recurringId ?? '', {
    query: { enabled: !!slug && !!recurringId && open },
  })
  const { data: accountsData } = useListAccounts(slug, { query: { enabled: !!slug && open } })

  const { mutateAsync: previewUpdate, isPending: isPreviewing } =
    usePreviewUpdateRecurringTransaction()
  const { mutateAsync: updateRecurring, isPending: isUpdating } = useUpdateRecurringTransaction()

  const recurring = recurringData?.recurringTransaction

  const typeLabel = useMemo(() => {
    if (!recurring) return 'recebimentos'
    return recurring.type === 'income' ? 'recebimentos' : 'pagamentos'
  }, [recurring])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListRecurringTransactionsQueryKey(slug) })
    void invalidateTransactionQueries(queryClient, slug)
    if (recurringId) {
      queryClient.invalidateQueries({
        queryKey: getGetRecurringTransactionQueryKey(slug, recurringId),
      })
    }
  }

  const handleSave = async (values: ContractFormValues) => {
    if (!slug || !recurringId || !recurring) return

    const payload = buildRecurringUpdatePayload(values)
    const preview = await previewUpdate({ slug, id: recurringId, data: payload })

    setPendingPayload(values)
    setImpactPreview({
      preservedPastCount: preview.impact.preservedPastCount,
      updatedFuturePendingCount: preview.impact.updatedFuturePendingCount,
      currentAmount: preview.current.amount,
      proposedAmount: preview.proposed.amount,
    })
    setConfirmOpen(true)
  }

  const handleConfirm = async () => {
    if (!slug || !recurringId || !pendingPayload) return

    await updateRecurring({
      slug,
      id: recurringId,
      data: buildRecurringUpdatePayload(pendingPayload),
    })

    toast.success('Contrato recorrente atualizado')
    invalidateAll()
    setConfirmOpen(false)
    setPendingPayload(null)
    setImpactPreview(null)
    close()
  }

  const isPending = isPreviewing || isUpdating

  if (nested && !transactionOpen) return null
  if (!nested && transactionOpen) return null

  const drawerContentClass = nested ? stackyDrawerContentNested : stackyDrawerContent

  const panel = (
    <DrawerContent
      className={drawerContentClass}
      hideOverlay={nested}
      overlayClassName={stackyDrawerOverlay}
      onOverlayDismiss={close}
    >
      <DrawerHeader className={stackyDrawerHeader}>
        <DrawerTitle className={stackyDrawerTitle}>Contrato recorrente</DrawerTitle>
        <button
          type="button"
          aria-label="Fechar"
          className={stackyDrawerCloseButton}
          onClick={close}
        >
          <X className="size-5" />
        </button>
      </DrawerHeader>

      {isLoading || !recurring ? (
        <div className="px-6 py-8 text-sm text-slate-500">Carregando contrato...</div>
      ) : (
        <RecurringContractForm
          key={recurring.id}
          recurring={recurring}
          accounts={accountsData?.accounts ?? []}
          isPending={isPending}
          onSubmit={handleSave}
        />
      )}
    </DrawerContent>
  )

  const confirmDialog = (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar alteração do contrato</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-slate-600">
              {impactPreview && (
                <>
                  <p>
                    O histórico de <strong>{impactPreview.preservedPastCount}</strong>{' '}
                    {typeLabel} passados/pagos não será alterado.
                  </p>
                  {impactPreview.updatedFuturePendingCount > 0 && (
                    <p>
                      <strong>{impactPreview.updatedFuturePendingCount}</strong> {typeLabel}{' '}
                      pendentes futuros passarão de{' '}
                      {formatCurrency(centsStringToNumber(impactPreview.currentAmount))} para{' '}
                      {formatCurrency(centsStringToNumber(impactPreview.proposedAmount))}.
                    </p>
                  )}
                  {impactPreview.updatedFuturePendingCount === 0 && (
                    <p>Nenhum lançamento pendente futuro será alterado.</p>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void handleConfirm()} disabled={isUpdating}>
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (nested) {
    return (
      <>
        <DrawerNestedRoot open={open} onOpenChange={v => !v && close()} direction="right">
          {panel}
        </DrawerNestedRoot>
        {confirmDialog}
      </>
    )
  }

  return (
    <>
      <Drawer open={open} onOpenChange={v => !v && close()} direction="right">
        {panel}
      </Drawer>
      {confirmDialog}
    </>
  )
}
