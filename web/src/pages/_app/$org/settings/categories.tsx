import { createFileRoute } from '@tanstack/react-router'

import { CategoriesSettingsTab } from '@/features/settings/components/categories-tab'
import { SettingsPageShell } from '@/features/settings/components/settings-page-shell'

export const Route = createFileRoute('/_app/$org/settings/categories')({
  component: SettingsCategoriesPage,
})

function SettingsCategoriesPage() {
  return (
    <SettingsPageShell
      title="Categorias"
      subtitle="Gerencie suas categorias de receitas e despesas"
    >
      <CategoriesSettingsTab />
    </SettingsPageShell>
  )
}
