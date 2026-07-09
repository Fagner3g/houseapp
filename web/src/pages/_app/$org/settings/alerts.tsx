import { createFileRoute } from '@tanstack/react-router'

import { AlertsSettingsTab } from '@/features/settings/components/alerts-tab'
import { SettingsPageShell } from '@/features/settings/components/settings-page-shell'

export const Route = createFileRoute('/_app/$org/settings/alerts')({
  component: SettingsAlertsPage,
})

function SettingsAlertsPage() {
  return (
    <SettingsPageShell title="Alertas" subtitle="Configure lembretes e notificações da organização">
      <AlertsSettingsTab />
    </SettingsPageShell>
  )
}
