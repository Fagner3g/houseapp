import type { FastifyRequest } from 'fastify'

import { listUsers } from '@/domain/user/list-users'

export async function listUsersByOrgController(req: FastifyRequest) {
  const idOrg = req.organization.id

  const { users } = await listUsers({ idOrg })

  return { users }
}
