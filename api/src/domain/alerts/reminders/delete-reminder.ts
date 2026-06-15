import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { BadRequestError } from '@/http/utils/error'
import { cancelReminderLinkedTransactions } from './cancel-reminder-linked-transactions'

interface DeleteReminderRequest {
  id: string
  orgId: string
}

export async function deleteReminderService({ id, orgId }: DeleteReminderRequest) {
  const [existing] = await db
    .select({ id: customReminders.id })
    .from(customReminders)
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .limit(1)

  if (!existing) {
    throw new BadRequestError('Reminder not found')
  }

  await db.transaction(async trx => {
    await cancelReminderLinkedTransactions(id, { trx })
    await trx
      .delete(customReminders)
      .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
  })
}
