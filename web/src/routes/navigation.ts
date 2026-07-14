import { CreditCard, LayoutDashboard, LayoutList, Settings } from 'lucide-react'

import { useListOrganizations } from '@/api/generated/api'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { useOrgStore } from '@/stores/org'

export type NavSubItem = {
  title: string
  url: string
  matchPrefix: string
}

export type NavItem = {
  title: string
  url: string
  icon?: typeof LayoutDashboard
  matchPrefix?: string
  exact?: boolean
  search?: Record<string, string>
  children?: NavSubItem[]
}

const settingsChildren = [
  { title: 'Categorias', path: 'settings/categories', matchPrefix: 'settings/categories' },
  { title: 'Alertas', path: 'settings/alerts', matchPrefix: 'settings/alerts' },
  { title: 'Membros', path: 'settings/members', matchPrefix: 'settings/members' },
  { title: 'Geral', path: 'settings/general', matchPrefix: 'settings/general' },
] as const

const baseItems = [
  { title: 'Dashboard', path: '', icon: LayoutDashboard, exact: true },
  { title: 'Lançamentos', path: 'transactions', icon: LayoutList },
  { title: 'Cartões', path: 'accounts', icon: CreditCard, matchPrefix: 'accounts' },
  {
    title: 'Configurações',
    path: 'settings/categories',
    icon: Settings,
    matchPrefix: 'settings',
    children: settingsChildren,
  },
] as const

function buildUrl(slug: string, path: string) {
  return path ? `/${slug}/${path}` : `/${slug}`
}

export function useNavItems(): NavItem[] {
  const slug = useOrgStore(s => s.slug)
  const { data } = useListOrganizations()
  const { slug: activeSlug } = useActiveOrganization()
  const fallbackSlug = slug || activeSlug || data?.organizations?.[0]?.slug || ''

  return baseItems.map(item => {
    const url = fallbackSlug ? buildUrl(fallbackSlug, item.path) : '/sign-in'
    return {
      title: item.title,
      url,
      icon: item.icon,
      matchPrefix: 'matchPrefix' in item ? item.matchPrefix : undefined,
      exact: 'exact' in item ? item.exact : undefined,
      search: 'search' in item ? item.search : undefined,
      children:
        'children' in item && fallbackSlug
          ? item.children.map(child => ({
              title: child.title,
              url: buildUrl(fallbackSlug, child.path),
              matchPrefix: child.matchPrefix,
            }))
          : undefined,
    }
  })
}

export function findSettingsNavItem(items: NavItem[]) {
  return items.find(item => item.title === 'Configurações')
}
