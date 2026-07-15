import type { ReactNode } from 'react'

import { SettingsSubNav } from '@/features/settings/components/settings-sub-nav'
import { pageInset, pageShell, pageSubtitle, pageTitle } from '@/lib/ui-classes'

interface SettingsPageShellProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function SettingsPageShell({ title, subtitle, children }: SettingsPageShellProps) {
  return (
    <div className={pageShell}>
      <SettingsSubNav />
      <div className={pageInset}>
        <h1 className={pageTitle}>{title}</h1>
        {subtitle && <p className={pageSubtitle}>{subtitle}</p>}
      </div>
      <div className={pageInset}>{children}</div>
    </div>
  )
}
