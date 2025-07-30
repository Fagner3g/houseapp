import { createId } from '@paralleldrive/cuid2'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  ddd: text('phone').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  /* Default organization used on signup */
  defaultOrganizationId: text('default_organization_id')
    .notNull()
    .references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userOrganizations = pgTable('user_organizations', {
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const goals = pgTable('goals', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text('user_id')
    .references(() => users.id)
    .notNull(),
  title: text('title').notNull(),
  desiredWeeklyFrequency: integer('desired_weekly_frequency').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const goalCompletions = pgTable('goal_completions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  goalId: text('goal_id')
    .references(() => goals.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const expenses = pgTable('expenses', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  title: text('title').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  payToId: text('pay_to_id')
    .notNull()
    .references(() => users.id),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizations.id),
  amount: integer('amount').notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
