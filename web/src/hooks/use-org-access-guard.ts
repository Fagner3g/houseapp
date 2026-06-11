import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useListOrganizations } from '@/api/generated/api'
import { useOrgStore } from '@/stores/org'

import { getOrgFromMatches } from './use-active-organization'

/**
 * Redirects away from org-scoped routes when the URL slug is stale
 * (e.g. user was removed from the org but the browser tab kept the old path).
 *
 * Returns `blocked` while verifying access so org-scoped pages do not fire
 * API requests against an inaccessible slug.
 */
export function useOrgAccessGuard() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const matches = useRouterState({ select: s => s.matches })
  const setSlug = useOrgStore(s => s.setSlug)
  const { data, isLoading, isFetching } = useListOrganizations()

  const routeSlug = getOrgFromMatches(matches as Array<{ params: Record<string, unknown> }>)
  const orgs = data?.organizations
  const isResolvingOrgs = isLoading || isFetching
  const hasOrgList = Array.isArray(orgs)
  const isAllowed =
    !routeSlug || (hasOrgList && orgs.some(org => org.slug === routeSlug))
  const isDenied = Boolean(routeSlug && hasOrgList && orgs.length > 0 && !isAllowed)
  const blocked = Boolean(routeSlug && (isResolvingOrgs || isDenied))

  useEffect(() => {
    if (!isDenied || !orgs?.length) return

    const fallbackSlug = orgs[0].slug
    setSlug(fallbackSlug)

    const segments = pathname.split('/').filter(Boolean)
    const [, ...rest] = segments
    const suffix = rest.length > 0 ? `/${rest.join('/')}` : '/dashboard'

    navigate({ to: `/${fallbackSlug}${suffix}`, replace: true })
  }, [isDenied, orgs, pathname, navigate, setSlug])

  return { blocked }
}
