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

  const [home, transactions, accountsItem, settingsItem] = items

  const navLink = (item: (typeof items)[number], search?: Record<string, string>) => {
    const Icon = item.icon
    const active = matchNavItem(pathname, item)
    const label = item.shortTitle ?? item.title
    return (
      <Link
        key={item.title}
        to={item.url}
        search={search}
        aria-label={item.title}
        className={cn(
          'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] leading-none font-medium transition-colors',
          active ? 'text-violet-700' : 'text-slate-400'
        )}
      >
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            active && 'bg-violet-100'
          )}
        >
          {Icon && <Icon className={cn('size-5', active && 'stroke-[2.5] text-violet-600')} />}
        </span>
        <span className="max-w-full truncate px-0.5">{label}</span>
      </Link>
    )
  }

  return (
    <nav className="absolute inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="relative mx-auto flex h-16 max-w-lg items-stretch px-1">
        {home && navLink(home)}
        {transactions && navLink(transactions)}
        <div className="flex flex-1" aria-hidden />
        {accountsItem && navLink(accountsItem)}
        {settingsItem && navLink(settingsItem)}
        <Button
          size="icon"
          className="absolute left-1/2 top-0 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600 shadow-lg ring-4 ring-white hover:bg-violet-700"
          onClick={() => openTransactionDrawer()}
          aria-label="Nova transação"
        >
          <Plus className="size-6 text-white" strokeWidth={2.5} />
        </Button>
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
      className="absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 size-11 rounded-full border-slate-200 bg-white shadow-md hover:bg-slate-50 md:fixed md:bottom-6 md:right-6"
      onClick={openAiChat}
      aria-label="Assistente IA"
    >
      <MessageCircle className="size-5 text-violet-600" />
    </Button>
  )
}
