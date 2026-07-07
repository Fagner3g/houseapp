import { getAuthToken } from '@/lib/auth'
import { env } from '@/lib/env'

export type BulkReviewImportUpdate = {
  transactionId: string
  categoryIds?: string[]
  split?: {
    userId?: string | null
    contactName?: string | null
    contactPhone?: string | null
    amount: string
    description?: string | null
  }
}

export async function bulkReviewImport(
  slug: string,
  updates: BulkReviewImportUpdate[]
): Promise<{ splitsCreated: number }> {
  const token = getAuthToken()
  const url = new URL(`/organizations/${slug}/transactions/bulk-review-import`, env.VITE_API_HOST)

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ updates }),
  })

  if (!response.ok) {
    let message = `Erro ao salvar revisão (${response.status})`
    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  return (await response.json()) as { splitsCreated: number }
}
