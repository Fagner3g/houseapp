import dayjs from 'dayjs'
import slugify from 'slugify'

import { client, db } from '.'
import { expenses } from './schemas/expenses'
import { goalCompletions } from './schemas/goalCompletions'
import { goals } from './schemas/goals'
import { invites } from './schemas/invites'
import { organizations } from './schemas/organization'
import { userOrganizations } from './schemas/userOrganization'
import { users } from './schemas/users'

async function seed() {
  await db.delete(goalCompletions)
  await db.delete(goals)
  await db.delete(expenses)
  await db.delete(invites)
  await db.delete(userOrganizations)
  await db.delete(users)
  await db.delete(organizations)

  const [org, otherOrg] = await db
    .insert(organizations)
    .values([
      { name: 'My House', slug: slugify('My House', { lower: true }) },
      { name: 'Work Place', slug: slugify('Work Place', { lower: true }) },
    ])
    .returning()

  const [user, otherUser, thirdUser] = await db
    .insert(users)
    .values([
      {
        name: 'Fagner Gomes',
        avatarUrl: 'https://github.com/fagner3g.png',
        email: 'fagner.egomes@gmail.com',
        phone: '5511999999999',
        ddd: '11',
        defaultOrganizationId: org.id,
      },
      {
        name: 'Diego Fernandes',
        avatarUrl: 'https://github.com/diego3g.png',
        email: 'g9L3N@example.com',
        phone: '5511999999999',
        ddd: '11',
        defaultOrganizationId: org.id,
      },
      {
        name: 'Ana Souza',
        avatarUrl: 'https://example.com/ana.png',
        email: 'ana@example.com',
        phone: '5511988888888',
        ddd: '11',
        defaultOrganizationId: otherOrg.id,
      },
    ])
    .returning()

  await db.insert(userOrganizations).values([
    { userId: user.id, organizationId: org.id },
    { userId: otherUser.id, organizationId: org.id },
    { userId: thirdUser.id, organizationId: otherOrg.id },
  ])

  await db.insert(expenses).values([
    {
      title: 'Aluguel',
      ownerId: user.id,
      payToId: otherUser.id,
      organizationId: org.id,
      amount: 1000,
      dueDate: dayjs().add(5, 'day').toDate(),
      description: 'Mensalidade do apartamento',
    },
    {
      title: 'Internet',
      ownerId: otherUser.id,
      payToId: thirdUser.id,
      organizationId: otherOrg.id,
      amount: 200,
      dueDate: dayjs().add(3, 'day').toDate(),
      description: 'Plano mensal',
    },
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
