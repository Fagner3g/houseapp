import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * Read the organization slug from the current URL and provide helpers to change it.
 */
export function useActiveOrganization() {
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const [, orgId] = pathname.split('/')

  function setOrganization(newOrgId: string) {
    const [, , ...rest] = pathname.split('/')
    router.navigate({ to: `/${newOrgId}/${rest.join('/')}` })
  }

  return { orgId, setOrganization }
}
