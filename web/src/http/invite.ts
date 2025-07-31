import { http } from './client'

export interface InviteResponse {
  invite: {
    id: string
    email: string
    organizationId: string
    organizationSlug: string
    token: string
    acceptedAt: string | null
    createdAt: string
  } | null
}

export function getInvite(token: string) {
  return http<InviteResponse>(`/invites/${token}`, { method: 'GET' })
}
