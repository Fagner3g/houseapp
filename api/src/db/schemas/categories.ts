import { createId } from '@paralleldrive/cuid2'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'
import { boolean, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

import { organizations } from './organizations'

export type CategoryType = 'income' | 'expense'

export const categories = pgTable(
  'categories',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').$type<CategoryType>().notNull().default('expense'),
    color: text('color'),
    icon: text('icon'),
    parentId: text('parent_id').references((): AnyPgColumn => categories.id, {
      onDelete: 'set null',
    }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  table => [
    unique('categories_organization_id_name_parent_id_type_unique').on(
      table.organizationId,
      table.name,
      table.parentId,
      table.type
    ),
  ]
)
