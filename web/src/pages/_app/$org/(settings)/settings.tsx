import { createFileRoute } from '@tanstack/react-router'
import { Info, Settings as SettingsIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_app/$org/(settings)/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  // Versão do app
  const appVersion = import.meta.env.VITE_APP_VERSION || '1.0.6'

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da aplicação</p>
      </div>

      <div className="px-4 lg:px-6">
        <div className="grid gap-6">
          {/* Informações do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Informações do Sistema
              </CardTitle>
              <CardDescription>
                Informações sobre a versão e configurações da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Versão da Aplicação</p>
                  <p className="text-sm text-muted-foreground">Versão atual do House App</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">v{appVersion}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Ambiente</p>
                  <p className="text-sm text-muted-foreground">Ambiente de execução atual</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">
                    {import.meta.env.MODE === 'development' ? 'Desenvolvimento' : 'Produção'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Configurações Gerais
              </CardTitle>
              <CardDescription>Configurações gerais da aplicação</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Mais configurações serão adicionadas em futuras versões.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
