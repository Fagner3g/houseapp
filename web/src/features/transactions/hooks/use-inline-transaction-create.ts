import { useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  getListTransactionsQueryKey,
  useCreateTransaction,
  useListAccounts,
} from '@/api/generated/api'
import { filterPaymentAccounts } from '@/features/accounts/constants'
import { reaisToMoneyString } from '@/lib/currency'
import { readHttpErrorMessage } from '@/lib/http'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useDrawerStore } from '@/stores/drawers'

export type InlineTxType = 'expense' | 'income'

export type InlineTransactionDraft = {
  type: InlineTxType
  title: string
  amount: number
  categoryId: string
  accountId: string
  date: string
}

const defaultDraft = (): InlineTransactionDraft => ({
  type: 'expense',
  title: '',
  amount: 0,
  categoryId: '',
  accountId: '',
  date: dayjs().format('YYYY-MM-DD'),
})

export function useInlineTransactionCreate(lockedAccountId?: string) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const titleRef = useRef<HTMLInputElement>(null)
  const focusToken = useDrawerStore(s => s.inlineCreateFocusToken)
  const openFullDrawer = useDrawerStore(s => s.openTransactionDrawer)

  const { mutateAsync: createTransaction, isPending } = useCreateTransaction()
  const { data: accountsData } = useListAccounts(slug, { query: { enabled: !!slug } })
  const activeAccounts = accountsData?.accounts ?? []
  const paymentAccounts = useMemo(() => filterPaymentAccounts(activeAccounts), [activeAccounts])

  const resolvedLockedAccountId = useMemo(() => {
    if (!lockedAccountId) return undefined
    return activeAccounts.some(account => account.id === lockedAccountId)
      ? lockedAccountId
      : undefined
  }, [activeAccounts, lockedAccountId])

  const [draft, setDraft] = useState(defaultDraft)

  useEffect(() => {
    if (resolvedLockedAccountId) {
      setDraft(prev =>
        prev.accountId === resolvedLockedAccountId
          ? prev
          : { ...prev, accountId: resolvedLockedAccountId }
      )
      return
    }
    const firstAccount = paymentAccounts[0]?.id
    if (firstAccount && !draft.accountId) {
      setDraft(prev => ({ ...prev, accountId: firstAccount }))
    }
  }, [paymentAccounts, draft.accountId, resolvedLockedAccountId])

  useEffect(() => {
    if (focusToken > 0) {
      titleRef.current?.focus()
      titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusToken])

  const patch = (partial: Partial<InlineTransactionDraft>) => {
    setDraft(prev => ({ ...prev, ...partial }))
  }

  const reset = () => {
    setDraft({
      ...defaultDraft(),
      accountId: resolvedLockedAccountId ?? paymentAccounts[0]?.id ?? '',
    })
    titleRef.current?.focus()
  }

  const openDetails = () => {
    openFullDrawer(
      {
        title: draft.title || undefined,
        type: draft.type,
        amount: draft.amount > 0 ? reaisToMoneyString(draft.amount) : undefined,
        date: dayjs(draft.date).toISOString(),
        accountId: draft.accountId || undefined,
        categoryIds: draft.categoryId ? [draft.categoryId] : undefined,
        status: 'pending',
      },
      null,
      lockedAccountId ? { lockAccountId: resolvedLockedAccountId } : undefined
    )
  }

  const save = async () => {
    if (!slug) return

    if (!draft.title.trim()) {
      toast.error('Informe a descrição')
      titleRef.current?.focus()
      return
    }
    if (draft.amount <= 0) {
      toast.error('Informe o valor')
      return
    }
    if (!draft.accountId && !resolvedLockedAccountId) {
      toast.error('Selecione a conta')
      return
    }

    const accountId =
      resolvedLockedAccountId ??
      (paymentAccounts.some(account => account.id === draft.accountId)
        ? draft.accountId
        : paymentAccounts[0]?.id)

    if (!accountId) {
      toast.error('Nenhuma conta ativa disponível')
      return
    }

    try {
      await createTransaction({
        slug,
        data: {
          title: draft.title.trim(),
          type: draft.type,
          amount: reaisToMoneyString(draft.amount),
          date: dayjs(draft.date).toISOString(),
          accountId,
          categoryIds: draft.categoryId ? [draft.categoryId] : undefined,
          status: 'pending',
        },
      })
      await queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(slug) })
      toast.success('Lançamento criado')
      reset()
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao criar lançamento'))
    }
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void save()
    }
  }

  return {
    draft,
    patch,
    save,
    openDetails,
    onKeyDown,
    titleRef,
    isPending,
    accounts: paymentAccounts,
    lockedAccountId: resolvedLockedAccountId,
  }
}
