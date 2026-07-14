import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  getListAccountsQueryKey,
  useDeleteAccount,
  useListAccounts,
} from '@/api/generated/api'
import type { CreateAccountBodyType, ListAccounts200AccountsItem } from '@/api/generated/model'
import type {
  AccountsHubKind,
  AccountsHubView,
} from '@/features/accounts/components/accounts-hub-sub-nav'
import type { InvoiceQuickFilter } from '@/features/credit-cards/components/credit-card-statement-filter-utils'
import {
  filterPaymentAccounts,
  groupAccountsForSidebar,
  groupCreditCardsForSidebar,
} from '@/features/accounts/constants'
import {
  defaultMonthForKind,
  resolveHubSelectionPatch,
} from '@/features/accounts/lib/accounts-hub-selection'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

export type AccountsHubSearch = {
  kind?: AccountsHubKind
  accountId?: string
  month?: string
  view?: 'settings' | 'analytics'
  invoiceFilter?: InvoiceQuickFilter
}

type UpdateSearchPatch = {
  kind?: AccountsHubKind
  accountId?: string
  month?: string
  view?: 'settings' | 'analytics' | undefined
  invoiceFilter?: InvoiceQuickFilter | undefined
}

export function useAccountsHub(search: AccountsHubSearch) {
  const { slug } = useActiveOrganization()
  const navigate = useNavigate({ from: '/$org/accounts/' })
  const queryClient = useQueryClient()
  const openAccountDrawer = useDrawerStore(s => s.openAccountDrawer)

  const kind: AccountsHubKind = search.kind ?? 'cards'
  const { accountId, month, view, invoiceFilter } = search
  const currentView: AccountsHubView =
    view === 'settings' ? 'settings' : view === 'analytics' ? 'analytics' : 'statement'

  const { data, isLoading, error, refetch } = useListAccounts(slug, {
    query: { enabled: !!slug, placeholderData: keepPreviousData },
  })
  const { mutateAsync: deleteAccount, isPending: isDeletingAccount } = useDeleteAccount()
  const [accountToDelete, setAccountToDelete] = useState<ListAccounts200AccountsItem | null>(null)

  const accounts = useMemo(() => data?.accounts ?? [], [data?.accounts])
  const creditCards = useMemo(
    () => accounts.filter(account => account.type === 'credit_card'),
    [accounts]
  )
  const paymentAccounts = useMemo(() => filterPaymentAccounts(accounts), [accounts])
  const activeList = kind === 'cards' ? creditCards : paymentAccounts

  const sections = useMemo(
    () =>
      kind === 'cards'
        ? groupCreditCardsForSidebar(accounts)
        : groupAccountsForSidebar(paymentAccounts),
    [kind, accounts, paymentAccounts]
  )

  const selectedId = accountId ?? activeList[0]?.id
  const selectedAccount = activeList.find(account => account.id === selectedId)
  const monthKey = month ?? defaultMonthForKind(kind)

  useEffect(() => {
    const patch = resolveHubSelectionPatch({
      accounts,
      accountId,
      kind,
      activeList,
      previousMonth: month,
      previousInvoiceFilter: invoiceFilter,
    })
    if (!patch) return
    navigate({
      search: prev => ({ ...prev, ...patch }),
      replace: true,
    })
  }, [accounts, accountId, activeList, kind, month, invoiceFilter, navigate])

  const invalidateAccounts = () => {
    queryClient.invalidateQueries({ queryKey: getListAccountsQueryKey(slug) })
  }

  const updateSearch = (patch: UpdateSearchPatch) => {
    navigate({
      search: prev => ({ ...prev, ...patch }),
      replace: true,
    })
  }

  const handleKindChange = (nextKind: AccountsHubKind) => {
    const nextList = nextKind === 'cards' ? creditCards : paymentAccounts
    updateSearch({
      kind: nextKind,
      accountId: nextList[0]?.id,
      month: defaultMonthForKind(nextKind),
      view: undefined,
      invoiceFilter: undefined,
    })
  }

  const handleCreate = (type: CreateAccountBodyType, institution?: string | null) => {
    const nextKind: AccountsHubKind = type === 'credit_card' ? 'cards' : 'accounts'
    openAccountDrawer(
      newId => {
        invalidateAccounts()
        updateSearch({
          kind: nextKind,
          accountId: newId,
          month: defaultMonthForKind(nextKind),
          view: undefined,
        })
      },
      type,
      institution
    )
  }

  const confirmDelete = async () => {
    if (!slug || !accountToDelete) return
    const deleting = accountToDelete
    const isCard = deleting.type === 'credit_card'

    try {
      await deleteAccount({ slug, id: deleting.id })
      invalidateAccounts()
      if (deleting.id === selectedId) {
        const remaining = activeList.filter(account => account.id !== deleting.id)
        updateSearch({ accountId: remaining[0]?.id, view: undefined })
      }
      toast.success(isCard ? 'Cartão excluído' : 'Conta excluída')
      setAccountToDelete(null)
    } catch {
      toast.error(isCard ? 'Erro ao excluir cartão' : 'Erro ao excluir conta')
    }
  }

  return {
    kind,
    currentView,
    monthKey,
    invoiceFilter,
    isLoading,
    error,
    refetch,
    sections,
    selectedId,
    selectedAccount,
    creditCards,
    paymentAccounts,
    accountToDelete,
    isDeletingAccount,
    setAccountToDelete,
    invalidateAccounts,
    updateSearch,
    handleKindChange,
    handleViewChange: (nextView: AccountsHubView) => {
      updateSearch({
        view: nextView === 'statement' ? undefined : nextView,
        invoiceFilter: nextView === 'statement' ? invoiceFilter : undefined,
      })
    },
    handleCreate,
    handleOpenSettings: (account: ListAccounts200AccountsItem) => {
      updateSearch({
        kind: account.type === 'credit_card' ? 'cards' : 'accounts',
        accountId: account.id,
        view: 'settings',
      })
    },
    confirmDelete,
    handleViewExistingStatement: ({
      accountId: nextAccountId,
      monthKey: nextMonthKey,
    }: {
      accountId: string
      monthKey: string
    }) => {
      updateSearch({
        kind: 'cards',
        accountId: nextAccountId,
        month: nextMonthKey,
        view: undefined,
      })
    },
    handleImported: () => {
      refetch()
      invalidateAccounts()
    },
  }
}
