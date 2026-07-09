import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { pageTabsList, pageTabsTrigger } from '@/lib/ui-classes'

export type CreditCardView = 'statement' | 'analytics' | 'settings'

interface CreditCardSubNavProps {
  view: CreditCardView
  onViewChange: (view: CreditCardView) => void
}

export function CreditCardSubNav({ view, onViewChange }: CreditCardSubNavProps) {
  return (
    <Tabs
      value={view}
      onValueChange={value => onViewChange(value as CreditCardView)}
      className="px-4 lg:px-6"
    >
      <TabsList className={pageTabsList}>
        <TabsTrigger value="statement" className={pageTabsTrigger}>
          Fatura
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
