import dayjs from 'dayjs'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'

import { db } from '../db'
import { goalCompletions, goals } from '../db/schema'

interface CreateGoalCompletionRequest {
  goalId: string
}

export async function createGoalCompletion({ goalId }: CreateGoalCompletionRequest) {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const goalCompletetionCounts = db.$with('goal_completetion_counts').as(
    db
      .select({
        goalId: goalCompletions.goalId,
        completionCount: count(goalCompletions.id).as('completionCount'),
      })
      .from(goalCompletions)
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayOfWeek),
          lte(goalCompletions.createdAt, lastDayOfWeek),
          eq(goalCompletions.goalId, goalId)
        )
      )
      .groupBy(goalCompletions.goalId)
  )

  const result = await db
    .with(goalCompletetionCounts)
    .select({
      desiredWeekFrequency: goals.desiredWeeklyFrequency,
      completionCount: sql`COALESCE(${goalCompletetionCounts.completionCount}, 0)`.mapWith(Number),
    })
    .from(goals)
    .leftJoin(goalCompletetionCounts, eq(goals.id, goalCompletetionCounts.goalId))
    .where(eq(goals.id, goalId))
    .limit(1)

  const { desiredWeekFrequency, completionCount } = result[0]

  if (completionCount >= desiredWeekFrequency) {
    throw new Error('Goal already completed')
  }

  const insertResult = await db.insert(goalCompletions).values({ goalId }).returning()
  const goalCompletion = insertResult[0]

  return { goalCompletion }
}
