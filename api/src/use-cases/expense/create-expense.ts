import { db } from '@/db'
import { expenses } from '@/db/schema'
import { getOrganizationBySlug } from '../organization/get-organization-by-slug'

interface CreateExpenseRequest {
  title: string
  ownerId: string
  payToId: string
  organizationSlug: string
  amount: number
  dueDate: Date
  description?: string
}

export async function createExpense({
  title,
  ownerId,
  payToId,
  organizationSlug,
  amount,
  dueDate,
  description,
}: CreateExpenseRequest) {
  const { organization } = await getOrganizationBySlug({ slug: organizationSlug })

  if (!organization) {
    throw new Error('Organization not found')
  }
  const result = await db
    .insert(expenses)
    .values({
      title,
      ownerId,
      payToId,
      organizationId: organization.id,
      amount,
      dueDate,
      description,
    })
    .returning()

  const expense = result[0]

  return { expense }
}
