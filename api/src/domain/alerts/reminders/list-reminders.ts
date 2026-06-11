import { and, desc, eq, isNull } from 'drizzle-orm'

import { db } from '@/db'
import { customReminders } from '@/db/schemas/customReminders'
import { users } from '@/db/schemas/users'
import { serializeReminder } from '../utils'

interface ListRemindersRequest {
  orgId: string
  includeCompleted?: boolean
}

export async function listRemindersService({
  orgId,
  includeCompleted = false,
}: ListRemindersRequest) {
  const conditions = [eq(customReminders.organizationId, orgId)]
  if (!includeCompleted) {
    conditions.push(isNull(customReminders.completedAt))
  }

  const rows = await db
    .select({
      reminder: customReminders,
      recipientName: users.name,
    })
    .from(customReminders)
    .innerJoin(users, eq(customReminders.recipientUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(customReminders.dueDate))

  return {
    reminders: rows.map(row =>
      serializeReminder({ ...row.reminder, recipientName: row.recipientName })
    ),
  }
}
