import {
  useMutation,
  type QueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query'

import { http } from '@/lib/http'

export type CreateTransferBody = {
  fromAccountId: string
  toOrganizationSlug: string
  toAccountId: string
  amount: string
  date: string
  title?: string
  description?: string | null
}

export type CreateTransferResult = {
  from: { id: string; organizationId: string; transferPairId: string | null }
  to: { id: string; organizationId: string; transferPairId: string | null }
}

export async function createTransfer(
  slug: string,
  data: CreateTransferBody,
  options?: RequestInit
): Promise<CreateTransferResult> {
  return http<CreateTransferResult>(`/organizations/${slug}/transfers`, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(data),
  })
}

export function useCreateTransfer(
  options?: {
    mutation?: UseMutationOptions<
      CreateTransferResult,
      unknown,
      { slug: string; data: CreateTransferBody }
    >
  },
  queryClient?: QueryClient
): UseMutationResult<
  CreateTransferResult,
  unknown,
  { slug: string; data: CreateTransferBody }
> {
  return useMutation(
    {
      mutationKey: ['createTransfer'],
      mutationFn: ({ slug, data }) => createTransfer(slug, data),
      ...options?.mutation,
    },
    queryClient
  )
}
