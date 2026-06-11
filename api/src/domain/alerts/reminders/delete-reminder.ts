import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { BadRequestError } from '@/http/utils/error'

interface DeleteReminderRequest {
  id: string
  orgId: string
}

export async function deleteReminderService({ id, orgId }: DeleteReminderRequest) {
  const [deleted] = await db
    .delete(customReminders)
    .where(and(eq(customReminders.id, id), eq(customReminders.organizationId, orgId)))
    .returning({ id: customReminders.id })

  if (!deleted) {
    throw new BadRequestError('Reminder not found')
  }
}
