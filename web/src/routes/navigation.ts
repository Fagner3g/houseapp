import { CreditCard, LayoutDashboard, Rocket, Settings, Users } from 'lucide-react'

import { useListOrganizations } from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useOrgStore } from '@/stores/org'

const baseItems = [
  { title: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
  { title: 'Metas', path: 'goals', icon: Rocket },
  { title: 'Transações', path: 'transactions', icon: CreditCard },
  { title: 'Usuários', path: 'users', icon: Users },
  { title: 'Jobs', path: 'jobs', icon: Settings },
]

export function useNavItems() {
  const slug = useOrgStore(s => s.slug)
  const { data } = useListOrganizations()
  const { slug: activeSlug } = useActiveOrganization()

  const isMemberOfActiveOrg = (data?.organizations ?? []).some(org => org.slug === activeSlug)

  const items = isMemberOfActiveOrg ? baseItems : baseItems.filter(item => item.title !== 'Jobs')

  return items.map(item => ({ ...item, url: `/${slug}/${item.path}` }))
}
