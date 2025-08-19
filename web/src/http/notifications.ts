import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { http } from './client'

export interface NotificationPolicy {
  id: number
  scope: 'transaction' | 'goal'
  event: 'due_soon' | 'overdue'
  days_before?: number | null
  days_overdue?: number | null
  repeat_every_minutes?: number | null
  max_occurrences?: number | null
  channels: string
  active: boolean
}

export interface CreatePolicyInput {
  scope: 'transaction' | 'goal'
  event: 'due_soon' | 'overdue'
  days_before?: number | null
  days_overdue?: number | null
  repeat_every_minutes?: number | null
  max_occurrences?: number | null
  channels: string
  active?: boolean
}

export async function listPolicies(org: string) {
  return http<NotificationPolicy[]>(`/api/notifications/${org}/policies`, {
    method: 'GET',
  })
}

export async function createPolicy(org: string, data: CreatePolicyInput) {
  return http<NotificationPolicy>(`/api/notifications/${org}/policies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deletePolicy(org: string, id: number) {
  return http<void>(`/api/notifications/${org}/policies/${id}`, {
    method: 'DELETE',
  })
}

export function useListPolicies(slug: string) {
  return useQuery({
    queryKey: ['notification-policies', slug],
    queryFn: () => listPolicies(slug),
  })
}

export function useCreatePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: CreatePolicyInput }) =>
      createPolicy(slug, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notification-policies', vars.slug] })
    },
  })
}

export function useDeletePolicy() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slug, id }: { slug: string; id: number }) => deletePolicy(slug, id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notification-policies', vars.slug] })
    },
  })
}
