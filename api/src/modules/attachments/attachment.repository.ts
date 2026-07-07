import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import { transactionAttachments } from '@/db/schemas/transactionAttachments'

export type AttachmentRecord = typeof transactionAttachments.$inferSelect

export type CreateAttachmentData = {
  id?: string
  transactionId: string
  organizationId: string
  fileName: string
  contentType: string
  fileSize: bigint
  storageKey: string
  uploadedBy: string
}

export interface AttachmentRepository {
  findByTransaction(transactionId: string, organizationId: string): Promise<AttachmentRecord[]>
  findById(
    transactionId: string,
    organizationId: string,
    id: string
  ): Promise<AttachmentRecord | null>
  create(data: CreateAttachmentData): Promise<AttachmentRecord>
  delete(id: string): Promise<AttachmentRecord | null>
}

export class DrizzleAttachmentRepository implements AttachmentRepository {
  async findByTransaction(
    transactionId: string,
    organizationId: string
  ): Promise<AttachmentRecord[]> {
    return db
      .select()
      .from(transactionAttachments)
      .where(
        and(
          eq(transactionAttachments.transactionId, transactionId),
          eq(transactionAttachments.organizationId, organizationId)
        )
      )
      .orderBy(transactionAttachments.createdAt)
  }

  async findById(
    transactionId: string,
    organizationId: string,
    id: string
  ): Promise<AttachmentRecord | null> {
    const [attachment] = await db
      .select()
      .from(transactionAttachments)
      .where(
        and(
          eq(transactionAttachments.id, id),
          eq(transactionAttachments.transactionId, transactionId),
          eq(transactionAttachments.organizationId, organizationId)
        )
      )
      .limit(1)

    return attachment ?? null
  }

  async create(data: CreateAttachmentData): Promise<AttachmentRecord> {
    const [created] = await db
      .insert(transactionAttachments)
      .values({
        id: data.id,
        transactionId: data.transactionId,
        organizationId: data.organizationId,
        fileName: data.fileName,
        contentType: data.contentType,
        fileSize: data.fileSize,
        storageKey: data.storageKey,
        uploadedBy: data.uploadedBy,
      })
      .returning()

    return created
  }

  async delete(id: string): Promise<AttachmentRecord | null> {
    const [deleted] = await db
      .delete(transactionAttachments)
      .where(eq(transactionAttachments.id, id))
      .returning()

    return deleted ?? null
  }
}
