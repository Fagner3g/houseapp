import type { FastifyRequest } from 'fastify'

import { listOrganizations } from '@/functions/organization/list-organizations'

export async function listOrganizationController(request: FastifyRequest) {
  const userId = request.user.sub

  const { organizations } = await listOrganizations({ userId })

  return { organizations }
}
