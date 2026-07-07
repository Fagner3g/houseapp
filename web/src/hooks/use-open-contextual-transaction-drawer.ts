import { useRouterState } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { useCallback } from 'react'

import { useDrawerStore } from '@/stores/drawers'

export function useOpenContextualTransactionDrawer() {
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const pathname = useRouterState({ select: state => state.location.pathname })
  const routeSearch = useRouterState({
    select: state => state.location.search as { accountId?: string },
  })

  return useCallback(() => {
    const onAccountsPage = /\/accounts\/?$/.test(pathname)
    const accountId = onAccountsPage ? routeSearch.accountId : undefined

    if (accountId) {
      openTransactionDrawer(
        {
          accountId,
          type: 'expense',
          date: dayjs().toISOString(),
        },
        null,
        { lockAccountId: accountId }
      )
      return
    }

    openTransactionDrawer()
  }, [openTransactionDrawer, pathname, routeSearch.accountId])
}
