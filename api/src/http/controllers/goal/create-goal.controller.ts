import type { FastifyReply, FastifyRequest } from 'fastify'

import { createGoal } from '@/domain/goal/create-goals'
import type { CreateGoalBody } from '@/http/schemas/goal/create-goal.schema'

type Req = FastifyRequest<{ Body: CreateGoalBody }>

export async function createGoalController(request: Req, reply: FastifyReply) {
  const { desiredWeeklyFrequency, title } = request.body
  const userId = request.user.sub
  await createGoal({ desiredWeeklyFrequency, title, userId })

  return reply.status(201).send()
}
