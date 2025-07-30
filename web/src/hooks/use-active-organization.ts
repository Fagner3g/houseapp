import { useRouter, useRouterState } from '@tanstack/react-router'

/**
 * Read the organization slug from the current URL and provide helpers to change it.
 */
export function useActiveOrganization() {
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const [, orgSlug] = pathname.split('/')

  function setOrganization(newSlug: string) {
    const [, , ...rest] = pathname.split('/')
    router.navigate({ to: `/${newSlug}/${rest.join('/')}` })
  }

  return { orgSlug, setOrganization }
}
