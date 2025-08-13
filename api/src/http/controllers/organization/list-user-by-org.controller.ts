import type { FastifyRequest } from 'fastify'

import { userService } from '@/domain/user'

export async function listUsersByOrgController(req: FastifyRequest) {
  const idOrg = req.organization.id

  const { users } = await userService.listUsers({ idOrg })

  return { users }
}
