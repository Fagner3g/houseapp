import { createId } from '@paralleldrive/cuid2'
import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { organizations } from './organizations'
import { transactions } from './transactions'
import { users } from './users'

export const transactionAttachments = pgTable('transaction_attachments', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => transactions.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  contentType: text('content_type').notNull(),
  fileSize: bigint('file_size', { mode: 'bigint' }).notNull(),
  storageKey: text('storage_key').notNull(),
  uploadedBy: text('uploaded_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
