import { Link, useRouterState } from '@tanstack/react-router'
import { Plus, MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useOpenContextualTransactionDrawer } from '@/hooks/use-open-contextual-transaction-drawer'
import { matchNavItem } from '@/lib/nav'
import { useNavItems } from '@/routes/navigation'
import { useDrawerStore } from '@/stores/drawers'
import { cn } from '@/lib/utils'

function shouldShowHeaderNewTransaction(pathname: string) {
  return (
    !pathname.includes('/accounts') &&
    !pathname.includes('/transactions') &&
    !pathname.includes('/settings')
  )
}

export function HeaderNewTransactionButton() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const openTransactionDrawer = useOpenContextualTransactionDrawer()

  if (!shouldShowHeaderNewTransaction(pathname)) return null

  return (
    <Button
      className="hidden h-9 rounded-lg bg-slate-900 px-4 hover:bg-slate-800 md:inline-flex"
      onClick={() => openTransactionDrawer()}
    >
      <Plus className="size-4" strokeWidth={2.5} />
      Nova transação
    </Button>
  )
}

export function BottomNav() {
  const items = useNavItems()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const openTransactionDrawer = useOpenContextualTransactionDrawer()

  const [home, transactions, accountsItem] = items

  const navLink = (item: (typeof items)[number], search?: Record<string, string>) => {
    const Icon = item.icon
    const active = matchNavItem(pathname, item)
    return (
      <Link
        key={item.title}
        to={item.url}
        search={search}
        className={cn(
          'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors',
          active ? 'text-violet-700' : 'text-slate-400'
        )}
      >
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-lg transition-colors',
            active && 'bg-violet-100'
          )}
        >
          {Icon && <Icon className={cn('size-5', active && 'stroke-[2.5] text-violet-600')} />}
        </span>
        <span>{item.title}</span>
      </Link>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-end justify-around px-1 pt-1">
        {home && navLink(home)}
        {transactions && navLink(transactions)}
        <div className="-mt-5 flex flex-1 flex-col items-center">
          <Button
            size="icon"
            className="size-14 rounded-full bg-violet-600 shadow-lg ring-4 ring-white hover:bg-violet-700"
            onClick={() => openTransactionDrawer()}
            aria-label="Nova transação"
          >
            <Plus className="size-6 text-white" strokeWidth={2.5} />
          </Button>
        </div>
        {accountsItem && navLink(accountsItem)}
      </div>
    </nav>
  )
}

export function AiChatFab() {
  const openAiChat = useDrawerStore(s => s.openAiChat)

  return (
    <Button
      size="icon"
      variant="outline"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-30 size-11 rounded-full border-slate-200 bg-white shadow-md hover:bg-slate-50 md:bottom-6 md:right-6"
      onClick={openAiChat}
      aria-label="Assistente IA"
    >
      <MessageCircle className="size-5 text-violet-600" />
    </Button>
  )
}
