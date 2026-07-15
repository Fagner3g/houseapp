import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import {
  splitPaymentRequests,
  type SplitPaymentRequestStatus,
} from '@/db/schemas/splitPaymentRequests'

export type SplitPaymentRequestRecord = typeof splitPaymentRequests.$inferSelect

export type CreateSplitPaymentRequestData = {
  organizationId: string
  transactionId: string
  splitId: string
  requestedByUserId: string
  recipientUserId: string
  amount: bigint
  note?: string | null
}

export interface SplitPaymentRequestRepository {
  create(data: CreateSplitPaymentRequestData): Promise<SplitPaymentRequestRecord>
  findById(id: string): Promise<SplitPaymentRequestRecord | null>
  findPendingBySplitId(splitId: string): Promise<SplitPaymentRequestRecord | null>
  findPendingBySplitIds(splitIds: string[]): Promise<SplitPaymentRequestRecord[]>
  listPendingByRecipient(
    organizationId: string,
    recipientUserId: string
  ): Promise<SplitPaymentRequestRecord[]>
  updateStatus(
    id: string,
    status: Exclude<SplitPaymentRequestStatus, 'pending'>
  ): Promise<SplitPaymentRequestRecord | null>
  reopen(id: string): Promise<SplitPaymentRequestRecord | null>
  cancelPendingBySplitId(splitId: string): Promise<number>
}

export class DrizzleSplitPaymentRequestRepository implements SplitPaymentRequestRepository {
  async create(data: CreateSplitPaymentRequestData): Promise<SplitPaymentRequestRecord> {
    const [created] = await db
      .insert(splitPaymentRequests)
      .values({
        organizationId: data.organizationId,
        transactionId: data.transactionId,
        splitId: data.splitId,
        requestedByUserId: data.requestedByUserId,
        recipientUserId: data.recipientUserId,
        amount: data.amount,
        note: data.note ?? null,
        status: 'pending',
      })
      .returning()

    return created
  }

  async findById(id: string): Promise<SplitPaymentRequestRecord | null> {
    const [row] = await db
      .select()
      .from(splitPaymentRequests)
      .where(eq(splitPaymentRequests.id, id))
      .limit(1)

    return row ?? null
  }

  async findPendingBySplitId(splitId: string): Promise<SplitPaymentRequestRecord | null> {
    const [row] = await db
      .select()
      .from(splitPaymentRequests)
      .where(
        and(eq(splitPaymentRequests.splitId, splitId), eq(splitPaymentRequests.status, 'pending'))
      )
      .limit(1)

    return row ?? null
  }

  async findPendingBySplitIds(splitIds: string[]): Promise<SplitPaymentRequestRecord[]> {
    if (splitIds.length === 0) return []

    return db
      .select()
      .from(splitPaymentRequests)
      .where(
        and(
          inArray(splitPaymentRequests.splitId, splitIds),
          eq(splitPaymentRequests.status, 'pending')
        )
      )
  }

  async listPendingByRecipient(
    organizationId: string,
    recipientUserId: string
  ): Promise<SplitPaymentRequestRecord[]> {
    return db
      .select()
      .from(splitPaymentRequests)
      .where(
        and(
          eq(splitPaymentRequests.organizationId, organizationId),
          eq(splitPaymentRequests.recipientUserId, recipientUserId),
          eq(splitPaymentRequests.status, 'pending')
        )
      )
  }

  async updateStatus(
    id: string,
    status: Exclude<SplitPaymentRequestStatus, 'pending'>
  ): Promise<SplitPaymentRequestRecord | null> {
    const [updated] = await db
      .update(splitPaymentRequests)
      .set({
        status,
        respondedAt: new Date(),
      })
      .where(and(eq(splitPaymentRequests.id, id), eq(splitPaymentRequests.status, 'pending')))
      .returning()

    return updated ?? null
  }

  async reopen(id: string): Promise<SplitPaymentRequestRecord | null> {
    const [updated] = await db
      .update(splitPaymentRequests)
      .set({
        status: 'pending',
        respondedAt: null,
      })
      .where(eq(splitPaymentRequests.id, id))
      .returning()

    return updated ?? null
  }

  async cancelPendingBySplitId(splitId: string): Promise<number> {
    const cancelled = await db
      .update(splitPaymentRequests)
      .set({
        status: 'cancelled',
        respondedAt: new Date(),
      })
      .where(
        and(eq(splitPaymentRequests.splitId, splitId), eq(splitPaymentRequests.status, 'pending'))
      )
      .returning({ id: splitPaymentRequests.id })

    return cancelled.length
  }
}
