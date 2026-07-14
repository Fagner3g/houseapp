import type { CreateAccountBodyType, ListAccounts200AccountsItem } from '@/api/generated/model'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { AccountSidebarSection } from '../constants'
import type { AccountsHubKind } from './accounts-hub-sub-nav'
import { InstitutionSection } from './institution-section'

interface AccountTypeSidebarProps {
  kind: AccountsHubKind
  onKindChange: (kind: AccountsHubKind) => void
  sections: AccountSidebarSection<ListAccounts200AccountsItem>[]
  selectedId?: string
  onSelect: (accountId: string) => void
  onCreate: (type: CreateAccountBodyType, institution?: string | null) => void
  onOpenSettings: (account: ListAccounts200AccountsItem) => void
  onDelete: (account: ListAccounts200AccountsItem) => void
}

export function AccountTypeSidebar({
  kind,
  onKindChange,
  sections,
  selectedId,
  onSelect,
  onCreate,
  onOpenSettings,
  onDelete,
}: AccountTypeSidebarProps) {
  const sectionTitle = kind === 'cards' ? 'Seus cartões' : 'Suas contas'

  return (
    <aside className="flex max-h-[50vh] shrink-0 flex-col border-b border-slate-200 lg:h-full lg:max-h-none lg:w-72 lg:border-b-0 lg:border-r">
      <div className="shrink-0 space-y-2 border-b border-slate-100 px-3 py-3 lg:px-4">
        <Tabs value={kind} onValueChange={value => onKindChange(value as AccountsHubKind)}>
          <TabsList className="grid h-9 w-full grid-cols-2 rounded-lg bg-slate-100 p-1">
            <TabsTrigger
              value="cards"
              className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Cartões
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              Conta
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="hidden text-xs font-semibold uppercase tracking-wide text-slate-400 lg:block">
          {sectionTitle}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sections.map(section => (
          <InstitutionSection
            key={section.key}
            section={section}
            selectedId={selectedId}
            onSelect={onSelect}
            onCreate={onCreate}
            onOpenSettings={onOpenSettings}
            onDelete={onDelete}
          />
        ))}
      </div>
    </aside>
  )
}
