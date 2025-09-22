import { CreditCard, LayoutDashboard, Rocket, Settings, Users } from 'lucide-react'

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
  return baseItems.map(item => ({ ...item, url: `/${slug}/${item.path}` }))
}
