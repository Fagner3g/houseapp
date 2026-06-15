import { createId } from '@paralleldrive/cuid2'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { customReminders } from './customReminders'
import { transactionOccurrences } from './transactionOccurrences'
import { transactionSeries } from './transactionSeries'

export const reminderOccurrenceTransactions = pgTable('reminder_occurrence_transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  reminderId: text('reminder_id')
    .notNull()
    .references(() => customReminders.id, { onDelete: 'cascade' }),
  periodKey: text('period_key').notNull(),
  occurrenceId: text('occurrence_id')
    .notNull()
    .references(() => transactionOccurrences.id, { onDelete: 'cascade' }),
  seriesId: text('series_id')
    .notNull()
    .references(() => transactionSeries.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
