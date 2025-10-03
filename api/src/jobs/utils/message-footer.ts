import { env } from '@/config/env'

export function addMessageFooter(message: string, organizationSlug?: string): string {
  const ensureTrailingSlash = (url: string): string => (url.endsWith('/') ? url : `${url}/`)
  const baseUrl = ensureTrailingSlash(env.WEB_URL)
  const url = organizationSlug ? `${baseUrl}${organizationSlug}/transactions` : baseUrl

  const footer = `---
🏠 HouseApp - Sistema de Gestão Financeira
${url}`

  return `${message}\n\n${footer}`
}
