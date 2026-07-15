import { useRouterState } from '@tanstack/react-router'

import { HeaderNewTransactionButton } from '@/components/layout/app-chrome'
import { NotificationsMenu } from '@/features/notifications/components/notifications-menu'
import { useSidebar } from '@/hooks/use-sidebar'
import { cn } from '@/lib/utils'

export function Header() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { route } = useSidebar()

  const isOverdueTransactions = pathname.endsWith('/transactions/overdue')
  const isAccountsPage = pathname.includes('/accounts')

  return (
    <header
      className={cn(
        'flex shrink-0 items-center gap-3 px-5 lg:px-8',
        isAccountsPage ? 'py-3 lg:py-4' : 'py-5 lg:py-6'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!isOverdueTransactions && (
          <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
            {route?.title ?? 'Dashboard'}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <HeaderNewTransactionButton />
        <NotificationsMenu />
      </div>
    </header>
  )
}
