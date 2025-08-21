import dayjs from 'dayjs'
import { sql } from 'drizzle-orm'
import slugify from 'slugify'

import { client, db } from '.'
import { goalCompletions } from './schemas/goalCompletions'
import { goals } from './schemas/goals'
import { organizations } from './schemas/organization'
import { userOrganizations } from './schemas/userOrganization'
import { users } from './schemas/users'

async function seed() {
  await db.execute(sql`
    TRUNCATE TABLE
      "goal_completions",
      "goals",
      "invites",
      "user_organizations",
      "organizations",
      "users"
    RESTART IDENTITY CASCADE;
  `)

  const [user, otherUser, thirdUser] = await db
    .insert(users)
    .values([
      {
        name: 'Fagner Gomes',
        avatarUrl: 'https://github.com/fagner3g.png',
        email: 'fagner.egomes@gmail.com',
        phone: '5511999999999',
      },
      {
        name: 'Diego Fernandes',
        avatarUrl: 'https://github.com/diego3g.png',
        email: 'diego@gmail.com',
        phone: '5511999999999',
      },
      {
        name: 'Ana Souza',
        avatarUrl: 'https://example.com/ana.png',
        email: 'ana@gmail.com',
        phone: '5511988888888',
      },
    ])
    .returning()

  const [org, otherOrg] = await db
    .insert(organizations)
    .values([
      { name: 'My House', slug: slugify('My House', { lower: true }), ownerId: user.id },
      { name: 'Work Place', slug: slugify('Work Place', { lower: true }), ownerId: otherUser.id },
    ])
    .returning()

  await db.insert(userOrganizations).values([
    { userId: user.id, organizationId: org.id },
    { userId: otherUser.id, organizationId: org.id },
    { userId: thirdUser.id, organizationId: otherOrg.id },
  ])

  const result = await db
    .insert(goals)
    .values([
      { userId: user.id, title: 'Acordar cedo', desiredWeeklyFrequency: 5 },
      { userId: user.id, title: 'Me exercitar', desiredWeeklyFrequency: 2 },
      { userId: user.id, title: 'Meditar', desiredWeeklyFrequency: 1 },
    ])
    .returning()

  const startOfWeek = dayjs().startOf('week')

  await db.insert(goalCompletions).values([
    { goalId: result[0].id, createdAt: startOfWeek.toDate() },
    { goalId: result[1].id, createdAt: startOfWeek.add(1, 'day').toDate() },
  ])
}

seed().finally(() => client.end())
