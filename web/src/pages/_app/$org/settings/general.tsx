import { createFileRoute } from '@tanstack/react-router'
import { Info } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { SettingsPageShell } from '@/features/settings/components/settings-page-shell'
import { getAppEnvironmentLabel, getAppVersion } from '@/lib/app-info'

export const Route = createFileRoute('/_app/$org/settings/general')({
  component: SettingsGeneralPage,
})

function SettingsGeneralPage() {
  const appVersion = getAppVersion()
  const appEnvironment = getAppEnvironmentLabel()

  return (
    <SettingsPageShell title="Geral" subtitle="Informações do sistema">
      <Card className="finance-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informações do Sistema
          </CardTitle>
          <CardDescription>Versão e ambiente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">Versão</p>
            <p className="font-mono text-sm">v{appVersion}</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <p className="font-medium">Ambiente</p>
            <p className="font-mono text-sm">{appEnvironment}</p>
          </div>
        </CardContent>
      </Card>
    </SettingsPageShell>
  )
}
