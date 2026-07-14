import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pageTabsList, pageTabsTrigger } from '@/lib/ui-classes'

export type AccountsHubView = 'statement' | 'analytics' | 'settings'
export type AccountsHubKind = 'cards' | 'accounts'

interface AccountsHubSubNavProps {
  kind: AccountsHubKind
  view: AccountsHubView
  onViewChange: (view: AccountsHubView) => void
}

export function AccountsHubSubNav({ kind, view, onViewChange }: AccountsHubSubNavProps) {
  const statementLabel = kind === 'cards' ? 'Fatura' : 'Transações'

  return (
    <Tabs
      value={view}
      onValueChange={value => onViewChange(value as AccountsHubView)}
      className="px-4 lg:px-6"
    >
      <TabsList className={pageTabsList}>
        <TabsTrigger value="statement" className={pageTabsTrigger}>
          {statementLabel}
        </TabsTrigger>
        <TabsTrigger value="analytics" className={pageTabsTrigger}>
          Análise
        </TabsTrigger>
        <TabsTrigger value="settings" className={pageTabsTrigger}>
          Configurações
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
