import {
  Bell,
  BriefcaseBusiness,
  CreditCard,
  LayoutDashboard,
  Rocket,
  Users,
} from 'lucide-react'

import { useListOrganizations } from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useOrgStore } from '@/stores/org'

const baseItems = [
  { title: 'Carteira', url: '/investments', icon: BriefcaseBusiness },
  { title: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { title: 'Metas', path: 'goals', icon: Rocket },
  { title: 'Transações', path: 'transactions', icon: CreditCard },
  { title: 'Alertas', path: 'alerts', icon: Bell },
  { title: 'Usuários', path: 'users', icon: Users },
]

export function useNavItems() {
  const slug = useOrgStore(s => s.slug)
  const { data } = useListOrganizations()
  const { slug: activeSlug } = useActiveOrganization()
  const fallbackSlug = slug || activeSlug || data?.organizations?.[0]?.slug || ''

  return baseItems.map(item => {
    if ('url' in item) return item
    const url = fallbackSlug ? `/${fallbackSlug}/${item.path}` : '/investments'
    return { ...item, url }
  })
}
