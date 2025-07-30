import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useOrgStore } from '../stores/org'

/**
 * Read the organization slug from the current URL and provide helpers to change it.
 */
export function useActiveOrganization() {
  const router = useRouter()
  const pathname = useRouterState({ select: s => s.location.pathname })
  const { slug, setSlug } = useOrgStore()

  useEffect(() => {
    const [, urlSlug] = pathname.split('/')
    if (urlSlug && urlSlug !== slug) {
      setSlug(urlSlug)
    }
  }, [pathname, slug, setSlug])

  function setOrganization(newSlug: string) {
    const [, , ...rest] = pathname.split('/')
    setSlug(newSlug)
    router.navigate({ to: `/${newSlug}/${rest.join('/')}` })
  }

  return { orgSlug: slug, setOrganization }
}
