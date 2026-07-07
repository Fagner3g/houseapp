import type { FastifyReply, FastifyRequest } from 'fastify'
import { StatusCodes } from 'http-status-codes'

import { container } from '@/core/container'

type OrgParams = { slug: string }
type TransactionParams = OrgParams & { transactionId: string }
type AttachmentParams = TransactionParams & { id: string }

export async function listAttachmentsController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const attachments = await container.attachmentService.list(
    request.organization.id,
    request.params.transactionId
  )

  return reply.send({ attachments })
}

export async function getAttachmentController(
  request: FastifyRequest<{ Params: AttachmentParams }>,
  reply: FastifyReply
) {
  const attachment = await container.attachmentService.get(
    request.organization.id,
    request.params.transactionId,
    request.params.id
  )

  return reply.send({ attachment })
}

export async function uploadAttachmentController(
  request: FastifyRequest<{ Params: TransactionParams }>,
  reply: FastifyReply
) {
  const data = await request.file()

  if (!data) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'No file uploaded' })
  }

  const buffer = await data.toBuffer()
  const fileName = data.filename

  if (!fileName) {
    return reply.status(StatusCodes.BAD_REQUEST).send({ message: 'File name is required' })
  }

  const attachment = await container.attachmentService.upload(
    request.organization.id,
    request.params.transactionId,
    request.user.sub,
    {
      fileName,
      contentType: data.mimetype,
      buffer,
    }
  )

  return reply.status(StatusCodes.CREATED).send({ attachment })
}

export async function deleteAttachmentController(
  request: FastifyRequest<{ Params: AttachmentParams }>,
  reply: FastifyReply
) {
  await container.attachmentService.delete(
    request.organization.id,
    request.params.transactionId,
    request.params.id
  )

  return reply.status(StatusCodes.NO_CONTENT).send()
}

export async function downloadAttachmentController(
  request: FastifyRequest<{ Params: AttachmentParams }>,
  reply: FastifyReply
) {
  const file = await container.attachmentService.download(
    request.organization.id,
    request.params.transactionId,
    request.params.id
  )

  return reply
    .header('Content-Type', file.contentType)
    .header('Content-Disposition', `attachment; filename="${file.fileName}"`)
    .send(file.buffer)
}
