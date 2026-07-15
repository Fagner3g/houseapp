import { Link, useRouterState } from '@tanstack/react-router'

import { pageTabsList, pageTabsTrigger } from '@/lib/ui-classes'
import { cn } from '@/lib/utils'
import { findSettingsNavItem, useNavItems } from '@/routes/navigation'

export function SettingsSubNav() {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const items = useNavItems()
  const settingsItem = findSettingsNavItem(items)
  const children = settingsItem?.children

  if (!children?.length) return null

  return (
    <div className="px-4 md:hidden lg:px-6">
      <nav className={cn('flex', pageTabsList)} aria-label="Seções de configurações">
        {children.map(child => {
          const active = pathname.includes(`/${child.matchPrefix}`)
          return (
            <Link
              key={child.matchPrefix}
              to={child.url}
              className={cn(
                'inline-flex items-center',
                pageTabsTrigger,
                active && 'border-violet-600 text-violet-700'
              )}
              aria-current={active ? 'page' : undefined}
            >
              {child.title}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
