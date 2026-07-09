import { extname } from 'node:path'

import { badRequest, notFound } from '@/core/errors'
import { createId } from '@/core/ids'
import type { StorageProvider } from '@/core/storage/storage-provider'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'

import type { AttachmentRecord, AttachmentRepository } from './attachment.repository'

const MAX_FILE_SIZE = 15 * 1024 * 1024

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.xlsx',
  '.xls',
  '.doc',
  '.docx',
])

export type AttachmentDto = {
  id: string
  transactionId: string
  organizationId: string
  fileName: string
  contentType: string
  fileSize: number
  uploadedBy: string
  createdAt: string
}

function toAttachmentDto(attachment: AttachmentRecord): AttachmentDto {
  return {
    id: attachment.id,
    transactionId: attachment.transactionId,
    organizationId: attachment.organizationId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    fileSize: Number(attachment.fileSize),
    uploadedBy: attachment.uploadedBy,
    createdAt: attachment.createdAt.toISOString(),
  }
}

export type UploadAttachmentInput = {
  fileName: string
  contentType: string
  buffer: Buffer
}

export class AttachmentService {
  constructor(
    private readonly attachmentRepository: AttachmentRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly storageProvider: StorageProvider
  ) {}

  async list(organizationId: string, transactionId: string): Promise<AttachmentDto[]> {
    await this.ensureTransaction(organizationId, transactionId)

    const attachments = await this.attachmentRepository.findByTransaction(
      transactionId,
      organizationId
    )

    return attachments.map(toAttachmentDto)
  }

  async get(
    organizationId: string,
    transactionId: string,
    id: string
  ): Promise<AttachmentDto> {
    const attachment = await this.ensureAttachment(organizationId, transactionId, id)
    return toAttachmentDto(attachment)
  }

  async upload(
    organizationId: string,
    transactionId: string,
    uploadedBy: string,
    input: UploadAttachmentInput
  ): Promise<AttachmentDto> {
    await this.ensureTransaction(organizationId, transactionId)
    this.validateFile(input)

    const attachmentId = createId()
    const storageKey = `${organizationId}/${transactionId}/${attachmentId}/${input.fileName}`

    await this.storageProvider.put(storageKey, input.buffer, input.contentType)

    const created = await this.attachmentRepository.create({
      id: attachmentId,
      transactionId,
      organizationId,
      fileName: input.fileName,
      contentType: input.contentType,
      fileSize: BigInt(input.buffer.length),
      storageKey,
      uploadedBy,
    })

    return toAttachmentDto(created)
  }

  async delete(organizationId: string, transactionId: string, id: string): Promise<void> {
    const attachment = await this.ensureAttachment(organizationId, transactionId, id)

    await this.storageProvider.delete(attachment.storageKey)
    await this.attachmentRepository.delete(id)
  }

  async download(
    organizationId: string,
    transactionId: string,
    id: string
  ): Promise<{ buffer: Buffer; fileName: string; contentType: string }> {
    const attachment = await this.ensureAttachment(organizationId, transactionId, id)
    const buffer = await this.storageProvider.get(attachment.storageKey)

    return {
      buffer,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
    }
  }

  private validateFile(input: UploadAttachmentInput): void {
    if (input.buffer.length > MAX_FILE_SIZE) {
      throw badRequest('File exceeds maximum size of 15MB')
    }

    const extension = extname(input.fileName).toLowerCase()

    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw badRequest(
        'File type not allowed. Accepted: pdf, jpeg, png, webp, xlsx, xls, doc, docx'
      )
    }

    if (!ALLOWED_MIME_TYPES.has(input.contentType)) {
      throw badRequest(
        'Content type not allowed. Accepted: pdf, jpeg, png, webp, xlsx, xls, doc, docx'
      )
    }
  }

  private async ensureTransaction(organizationId: string, transactionId: string) {
    const transaction = await this.transactionRepository.findById(organizationId, transactionId)

    if (!transaction) {
      throw notFound('Transaction not found')
    }

    return transaction
  }

  private async ensureAttachment(
    organizationId: string,
    transactionId: string,
    id: string
  ): Promise<AttachmentRecord> {
    await this.ensureTransaction(organizationId, transactionId)

    const attachment = await this.attachmentRepository.findById(
      transactionId,
      organizationId,
      id
    )

    if (!attachment) {
      throw notFound('Attachment not found')
    }

    return attachment
  }
}
