import { createFileRoute } from '@tanstack/react-router'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminActionsCard } from '@/features/alerts/components/AdminActionsCard'
import { AlertsPreviewCard } from '@/features/alerts/components/AlertsPreviewCard'
import { RecentDeliveriesCard } from '@/features/alerts/components/RecentDeliveriesCard'
import { ReminderList } from '@/features/alerts/components/ReminderList'
import { RuleConfigForm } from '@/features/alerts/components/RuleConfigForm'
import { useActiveOrganization } from '@/hooks/use-active-organization'

export const Route = createFileRoute('/_app/$org/(admin)/alerts')({
  component: AlertsPage,
})

function AlertsPage() {
  const { slug } = useActiveOrganization()

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Alertas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie lembretes, regras automáticas e acompanhe os envios recentes.
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="reminders">Lembretes</TabsTrigger>
          <TabsTrigger value="rules">Regras automáticas</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 space-y-6">
          <AlertsPreviewCard slug={slug} />
          <AdminActionsCard slug={slug} />
          <RecentDeliveriesCard slug={slug} />
        </TabsContent>
        <TabsContent value="reminders" className="mt-4">
          <ReminderList slug={slug} />
        </TabsContent>
        <TabsContent value="rules" className="mt-4">
          <RuleConfigForm slug={slug} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
