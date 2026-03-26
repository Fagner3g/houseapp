import { BriefcaseBusiness, CreditCard, LayoutDashboard, Rocket, Settings, Users } from 'lucide-react'

import { useListOrganizations } from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useOrgStore } from '@/stores/org'

const baseItems = [
  { title: 'Carteira', url: '/investments', icon: BriefcaseBusiness },
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
  const fallbackSlug = slug || activeSlug || data?.organizations?.[0]?.slug || ''

  const isMemberOfActiveOrg = (data?.organizations ?? []).some(org => org.slug === activeSlug)

  const items = isMemberOfActiveOrg ? baseItems : baseItems.filter(item => item.title !== 'Jobs')

  return items.map(item => {
    if ('url' in item) return item
    return { ...item, url: fallbackSlug ? `/${fallbackSlug}/${item.path}` : '/investments' }
  })
}
