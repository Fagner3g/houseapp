import dayjs from 'dayjs'

import { client, db } from '.'
import { goalCompletions, goals, users } from './schema'

async function seed() {
  await db.delete(goals)
  await db.delete(goalCompletions)
  await db.delete(users)

  const [user] = await db
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
        email: 'g9L3N@example.com',
        phone: '5511999999999',
      },
    ])
    .returning()

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
