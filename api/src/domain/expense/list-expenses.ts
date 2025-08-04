import { and, eq, or } from 'drizzle-orm'

import { db } from '@/db'
import { expenses } from '@/db/schemas/expenses'
import { getOrganizationById } from '../organization/get-organization-by-slug'

interface ListExpensesRequest {
  userId: string
  organizationSlug: string
}

export async function listExpenses({ userId, organizationSlug }: ListExpensesRequest) {
  const { organization } = await getOrganizationById({ slug: organizationSlug })

  if (!organization) {
    return { expenses: [] }
  }

  const result = await db
    .select()
    .from(expenses)
    .where(
      and(
        or(eq(expenses.ownerId, userId), eq(expenses.payToId, userId)),
        eq(expenses.organizationId, organization.id)
      )
    )

  return { expenses: result }
}
