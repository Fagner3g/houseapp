export type NavItem = {
  title: string
  url: string
  matchPrefix?: string
  exact?: boolean
}

function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith('/')) {
    return path.slice(0, -1)
  }
  return path
}

export function matchNavItem(pathname: string, item: NavItem) {
  const current = normalizePath(pathname)
  const target = normalizePath(item.url)

  if (current === target) return true
  if (item.exact) return false
  if (item.matchPrefix && current.includes(`/${item.matchPrefix}`)) return true
  if (item.url !== '/sign-in' && current.startsWith(`${target}/`)) return true
  return false
}

export function findActiveNavItem(pathname: string, items: NavItem[]) {
  return items
    .filter(item => matchNavItem(pathname, item))
    .sort((a, b) => b.url.length - a.url.length)[0]
}
