import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import { authenticateUserHook } from '@/http/hooks/authenticate-user'
import { verifyOrgAccessHook } from '@/http/hooks/verify-user-belongs-to-org'

import {
  deleteAttachmentController,
  downloadAttachmentController,
  getAttachmentController,
  listAttachmentsController,
  uploadAttachmentController,
} from './attachment.controller'
import {
  deleteAttachmentSchema,
  downloadAttachmentSchema,
  getAttachmentSchema,
  listAttachmentsSchema,
  uploadAttachmentSchema,
} from './attachment.schema'

export const attachmentsRoutes: FastifyPluginAsyncZod = async app => {
  app.get('/organizations/:slug/transactions/:transactionId/attachments', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: listAttachmentsSchema,
    handler: listAttachmentsController,
  })

  app.post('/organizations/:slug/transactions/:transactionId/attachments', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: uploadAttachmentSchema,
    handler: uploadAttachmentController,
  })

  app.get('/organizations/:slug/transactions/:transactionId/attachments/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: getAttachmentSchema,
    handler: getAttachmentController,
  })

  app.delete('/organizations/:slug/transactions/:transactionId/attachments/:id', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: deleteAttachmentSchema,
    handler: deleteAttachmentController,
  })

  app.get('/organizations/:slug/transactions/:transactionId/attachments/:id/download', {
    onRequest: [authenticateUserHook],
    preHandler: [verifyOrgAccessHook],
    schema: downloadAttachmentSchema,
    handler: downloadAttachmentController,
  })
}
