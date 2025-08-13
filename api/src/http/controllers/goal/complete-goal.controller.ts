import type { FastifyReply, FastifyRequest } from 'fastify'

import { createGoalCompletion } from '@/domain/goal/create-goals-completion'
import type { CompleteGoalSchemaBody } from '@/http/schemas/goal/complete-goal.schema'

type Req = FastifyRequest<{
  Body: CompleteGoalSchemaBody
}>

export async function completeGoalController(request: Req, reply: FastifyReply) {
  const { goalId } = request.body
  const userId = request.user.sub

  await createGoalCompletion({ goalId, userId })

  return reply.status(201).send()
}
