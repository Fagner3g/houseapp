import z from 'zod'

export const attachmentResponseSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  organizationId: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  uploadedBy: z.string(),
  createdAt: z.string(),
})

const slugParams = z.object({ slug: z.string() })
const transactionParams = slugParams.extend({ transactionId: z.string() })
const attachmentParams = transactionParams.extend({ id: z.string() })

export const listAttachmentsSchema = {
  tags: ['Attachments'],
  description: 'List attachments for a transaction',
  operationId: 'listAttachments',
  params: transactionParams,
  response: {
    200: z.object({ attachments: z.array(attachmentResponseSchema) }),
  },
}

export const getAttachmentSchema = {
  tags: ['Attachments'],
  description: 'Get attachment metadata',
  operationId: 'getAttachment',
  params: attachmentParams,
  response: {
    200: z.object({ attachment: attachmentResponseSchema }),
  },
}

export const uploadAttachmentSchema = {
  tags: ['Attachments'],
  description: 'Upload attachment (multipart/form-data, field: file)',
  operationId: 'uploadAttachment',
  consumes: ['multipart/form-data'],
  params: transactionParams,
  response: {
    201: z.object({ attachment: attachmentResponseSchema }),
  },
}

export const deleteAttachmentSchema = {
  tags: ['Attachments'],
  description: 'Delete attachment',
  operationId: 'deleteAttachment',
  params: attachmentParams,
  response: {
    204: z.null(),
  },
}

export const downloadAttachmentSchema = {
  tags: ['Attachments'],
  description: 'Download attachment file',
  operationId: 'downloadAttachment',
  params: attachmentParams,
}
