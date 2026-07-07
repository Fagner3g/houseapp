import { useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'

import {
  getGetAccountQueryKey,
  getListAccountsQueryKey,
  useListAccounts,
  useUpdateAccount,
} from '@/api/generated/api'
import { useDrawerStore } from '@/stores/drawers'

import { PaymentAccountSelect } from './payment-account-select'

interface PaymentAccountFieldProps {
  slug: string
  accountId: string
  value: string | null | undefined
}

export function PaymentAccountField({ slug, accountId, value }: PaymentAccountFieldProps) {
  const queryClient = useQueryClient()
  const openAccountDrawer = useDrawerStore(s => s.openAccountDrawer)
  const { data } = useListAccounts(slug, { query: { enabled: !!slug } })
  const { mutateAsync: updateAccount, isPending } = useUpdateAccount()

  const handleChange = async (paymentAccountId: string | null) => {
    try {
      await updateAccount({ slug, id: accountId, data: { paymentAccountId } })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetAccountQueryKey(slug, accountId) }),
        queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) }),
      ])
      toast.success('Conta de pagamento atualizada')
    } catch {
      toast.error('Erro ao atualizar conta de pagamento')
    }
  }

  const handleCreatePaymentAccount = () => {
    openAccountDrawer(newId => {
      if (newId) void handleChange(newId)
      queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
    }, 'checking')
  }

  return (
    <div className="space-y-2">
      <PaymentAccountSelect
        accounts={data?.accounts ?? []}
        value={value}
        onValueChange={handleChange}
        excludeAccountId={accountId}
        disabled={isPending}
      />
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
        onClick={handleCreatePaymentAccount}
      >
        <Plus className="size-3" />
        Cadastrar conta bancária
      </button>
    </div>
  )
}
