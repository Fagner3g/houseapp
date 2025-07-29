import dayjs from 'dayjs'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'

import { db } from '../db'
import { goalCompletions, goals } from '../db/schema'

interface CreateGoalCompletionRequest {
  goalId: string
  userId: string
}

export async function createGoalCompletion({ userId, goalId }: CreateGoalCompletionRequest) {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const goalCompletetionCounts = db.$with('goal_completetion_counts').as(
    db
      .select({
        goalId: goalCompletions.goalId,
        completionCount: count(goalCompletions.id).as('completionCount'),
      })
      .from(goalCompletions)
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayOfWeek),
          lte(goalCompletions.createdAt, lastDayOfWeek),
          eq(goalCompletions.goalId, goalId),
          eq(goals.userId, userId)
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
    .where(and(eq(goals.id, goalId), eq(goals.userId, userId)))
    .limit(1)

  const { desiredWeekFrequency, completionCount } = result[0]

  if (completionCount >= desiredWeekFrequency) {
    throw new Error('Goal already completed')
  }

  const insertResult = await db.insert(goalCompletions).values({ goalId }).returning()
  const goalCompletion = insertResult[0]

  return { goalCompletion }
}
