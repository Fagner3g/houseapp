import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListAccountsQueryKey,
  useDeleteAccount,
  useListAccounts,
} from '@/api/generated/api'
import type { ListAccounts200AccountsItem } from '@/api/generated/model'
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
import { Button } from '@/components/ui/button'
import {
  ACCOUNT_TYPE_SINGULAR,
  accountTypeIcon,
  filterPaymentAccounts,
  formatAccountOptionLabel,
} from '@/features/accounts/constants'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

export function AccountsSettingsTab() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const openAccountDrawer = useDrawerStore(s => s.openAccountDrawer)
  const openEditAccountDrawer = useDrawerStore(s => s.openEditAccountDrawer)

  const { data, isLoading } = useListAccounts(slug, { query: { enabled: !!slug } })
  const { mutateAsync: deleteAccount, isPending: isDeleting } = useDeleteAccount()

  const [deleteTarget, setDeleteTarget] = useState<ListAccounts200AccountsItem | null>(null)

  const paymentAccounts = useMemo(
    () => filterPaymentAccounts(data?.accounts ?? []),
    [data?.accounts]
  )

  const invalidateAccounts = () => {
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
  }

  const handleCreate = () => {
    openAccountDrawer(() => invalidateAccounts(), 'checking')
  }

  const handleEdit = (account: ListAccounts200AccountsItem) => {
    openEditAccountDrawer(account.id, () => invalidateAccounts())
  }

  const handleDelete = async () => {
    if (!deleteTarget || !slug) return

    try {
      await deleteAccount({ slug, id: deleteTarget.id })
      toast.success('Conta excluída')
      invalidateAccounts()
      setDeleteTarget(null)
    } catch {
      toast.error('Não foi possível excluir a conta')
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Carregando contas...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="rounded-lg bg-slate-900 hover:bg-slate-800" onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          Nova conta
        </Button>
      </div>

      {paymentAccounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
          Nenhuma conta de pagamento cadastrada. Crie uma conta bancária, carteira ou poupança para
          lançamentos manuais.
        </div>
      ) : (
        <div className="divide-y rounded-lg border border-slate-200 bg-white">
          {paymentAccounts.map(account => {
            const Icon = accountTypeIcon(account.type)
            return (
              <div key={account.id} className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <Icon className="size-5 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{account.name}</p>
                    <p className="text-sm text-slate-500">{formatAccountOptionLabel(account)}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => handleEdit(account)}
                    aria-label={`Editar ${account.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-red-600 hover:text-red-700"
                    onClick={() => setDeleteTarget(account)}
                    aria-label={`Excluir ${account.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Cartões de crédito e importação OFX ficam em{' '}
        <span className="font-medium">Cartões</span> no menu lateral.
      </p>

      <AlertDialog open={deleteTarget != null} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir a conta{' '}
              <strong>{deleteTarget?.name}</strong> ({ACCOUNT_TYPE_SINGULAR[deleteTarget?.type ?? '']})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
