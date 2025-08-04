import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { createOrganizationController } from '@/http/controllers/organization/create-organization.controller'
import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { createOrganizationSchema } from '@/http/schemas/organization/create-organization.schema'
import { deleteOrgController } from '../controllers/organization/delete-org.controller'
import { listOrganizationController } from '../controllers/organization/list-organization'
import { listUsersByOrgController } from '../controllers/organization/list-user-by-org.controller'
import { renameOrgController } from '../controllers/organization/rename-org.controller'
import { verifyOrgAccessHook } from '../hooks/verify-user-belongs-to-org'
import { deleteOrgSchema } from '../schemas/organization/delete-org.schema'
import { listOrganizationsSchema } from '../schemas/organization/list-organization.schema'
import { listUsersByOrgSchema } from '../schemas/organization/list-users-by-org.schema'
import { renameOrgSchema } from '../schemas/organization/rename-org.schema'

export const createOrgRoute: FastifyPluginAsyncZod = async app => {
  app.post('/org', {
    onRequest: [authenticateUserHook],
    schema: createOrganizationSchema,
    handler: createOrganizationController,
  })
}

export const listOrgRoute: FastifyPluginAsyncZod = async app => {
  app.get('/orgs', {
    onRequest: [authenticateUserHook],
    schema: listOrganizationsSchema,
    handler: listOrganizationController,
  })
}

export const renameOrgRoute: FastifyPluginAsyncZod = async app => {
  app.put('/org/:slug', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: renameOrgSchema,
    handler: renameOrgController,
  })
}

export const deleteOrgRoute: FastifyPluginAsyncZod = async app => {
  app.delete('/org/:slug', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteOrgSchema,
    handler: deleteOrgController,
  })
}

export const listUsersByOrgRoute: FastifyPluginAsyncZod = async app => {
  app.get('/org/:slug/users', {
    onRequest: [authenticateUserHook],
    schema: listUsersByOrgSchema,
    preHandler: [verifyOrgAccessHook],
    handler: listUsersByOrgController,
  })
}
