import { createFileRoute } from '@tanstack/react-router'

import { MembersSettingsTab } from '@/features/settings/components/members-tab'
import { SettingsPageShell } from '@/features/settings/components/settings-page-shell'

export const Route = createFileRoute('/_app/$org/settings/members')({
  component: SettingsMembersPage,
})

function SettingsMembersPage() {
  return (
    <SettingsPageShell title="Membros" subtitle="Gerencie quem tem acesso à organização">
      <MembersSettingsTab />
    </SettingsPageShell>
  )
}
