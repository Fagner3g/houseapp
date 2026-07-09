import { and, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  accounts,
  type AccountType,
  type PixKeyType,
} from '@/db/schemas/accounts'

export type AccountRecord = typeof accounts.$inferSelect

export type CreateAccountData = {
  organizationId: string
  name: string
  type: AccountType
  institution?: string | null
  currency?: string
  creditLimit?: bigint | null
  closingDay?: number | null
  dueDay?: number | null
  paymentAccountId?: string | null
  initialBalance?: bigint
  pixKey?: string | null
  pixKeyType?: PixKeyType | null
  color?: string | null
  icon?: string | null
  displayOrder?: number
  ofxAccountId?: string | null
}

export type UpdateAccountData = Partial<
  Omit<CreateAccountData, 'organizationId' | 'type'>
> & {
  isActive?: boolean
}

export interface AccountRepository {
  findAllByOrganization(organizationId: string): Promise<AccountRecord[]>
  findAllByOrganizationIncludingInactive(organizationId: string): Promise<AccountRecord[]>
  findById(organizationId: string, id: string): Promise<AccountRecord | null>
  findByName(organizationId: string, name: string): Promise<AccountRecord | null>
  findByOfxAccountId(organizationId: string, ofxAccountId: string): Promise<AccountRecord | null>
  create(data: CreateAccountData): Promise<AccountRecord>
  update(id: string, data: UpdateAccountData): Promise<AccountRecord | null>
  softDelete(id: string): Promise<AccountRecord | null>
}

export class DrizzleAccountRepository implements AccountRepository {
  async findAllByOrganization(organizationId: string): Promise<AccountRecord[]> {
    return db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.organizationId, organizationId), eq(accounts.isActive, true))
      )
      .orderBy(accounts.displayOrder, accounts.name)
  }

  async findAllByOrganizationIncludingInactive(organizationId: string): Promise<AccountRecord[]> {
    return db
      .select()
      .from(accounts)
      .where(eq(accounts.organizationId, organizationId))
      .orderBy(accounts.displayOrder, accounts.name)
  }

  async findById(organizationId: string, id: string): Promise<AccountRecord | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.organizationId, organizationId)))
      .limit(1)

    return account ?? null
  }

  async findByName(organizationId: string, name: string): Promise<AccountRecord | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.organizationId, organizationId), eq(accounts.name, name)))
      .limit(1)

    return account ?? null
  }

  async findByOfxAccountId(
    organizationId: string,
    ofxAccountId: string
  ): Promise<AccountRecord | null> {
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(eq(accounts.organizationId, organizationId), eq(accounts.ofxAccountId, ofxAccountId))
      )
      .limit(1)

    return account ?? null
  }

  async create(data: CreateAccountData): Promise<AccountRecord> {
    const [created] = await db
      .insert(accounts)
      .values({
        organizationId: data.organizationId,
        name: data.name,
        type: data.type,
        institution: data.institution ?? null,
        currency: data.currency ?? 'BRL',
        creditLimit: data.creditLimit ?? null,
        closingDay: data.closingDay ?? null,
        dueDay: data.dueDay ?? null,
        paymentAccountId: data.paymentAccountId ?? null,
        initialBalance: data.initialBalance ?? 0n,
        pixKey: data.pixKey ?? null,
        pixKeyType: data.pixKeyType ?? null,
        color: data.color ?? null,
        icon: data.icon ?? null,
        displayOrder: data.displayOrder ?? 0,
        ofxAccountId: data.ofxAccountId ?? null,
      })
      .returning()

    return created
  }

  async update(id: string, data: UpdateAccountData): Promise<AccountRecord | null> {
    const [updated] = await db
      .update(accounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(accounts.id, id))
      .returning()

    return updated ?? null
  }

  async softDelete(id: string): Promise<AccountRecord | null> {
    const [updated] = await db
      .update(accounts)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning()

    return updated ?? null
  }
}
