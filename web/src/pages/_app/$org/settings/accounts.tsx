import { createFileRoute } from '@tanstack/react-router'

import { AccountsSettingsTab } from '@/features/settings/components/accounts-settings-tab'
import { SettingsPageShell } from '@/features/settings/components/settings-page-shell'

export const Route = createFileRoute('/_app/$org/settings/accounts')({
  component: SettingsAccountsPage,
})

function SettingsAccountsPage() {
  return (
    <SettingsPageShell
      title="Contas"
      subtitle="Gerencie contas para lançamentos manuais (bancárias, carteira e poupança)"
    >
      <AccountsSettingsTab />
    </SettingsPageShell>
  )
}
