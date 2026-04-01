import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useOrgStore } from '../stores/org'

function getOrgFromMatches(
  matches: Array<{
    params: Record<string, unknown>
  }>
) {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const value = matches[index]?.params?.org
    if (typeof value === 'string' && value.length > 0) {
      return value
    }
  }

  return ''
}

/**
 * Returns the org from the current route params when present.
 * On personal routes like `/investments`, keeps the last selected org as fallback
 * for navigation back into org-scoped areas.
 */
export function useActiveOrganization() {
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const matches = useRouterState({ select: s => s.matches })
  const { slug: storedSlug, setSlug } = useOrgStore()

  const routeSlug = getOrgFromMatches(matches as Array<{ params: Record<string, unknown> }>)
  const slug = routeSlug || storedSlug

  useEffect(() => {
    if (routeSlug && routeSlug !== storedSlug) {
      setSlug(routeSlug)
    }
  }, [routeSlug, storedSlug, setSlug])

  function setOrganization(newSlug: string) {
    const onOrgRoute = Boolean(routeSlug)

    setSlug(newSlug)
    if (!onOrgRoute) {
      router.navigate({ to: `/${newSlug}/dashboard` })
      return
    }

    const segments = pathname.split('/').filter(Boolean)
    const [, ...rest] = segments
    router.navigate({ to: `/${newSlug}/${rest.join('/')}` })
  }

  return { slug, routeSlug, setOrganization }
}
