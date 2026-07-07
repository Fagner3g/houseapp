import type {
  CardBlockedReason,
  CardBrand,
  CardCanceledReason,
  CardType,
} from '@/db/schemas/cards'
import { badRequest, notFound } from '@/core/errors'
import type { AccountRepository } from '@/modules/accounts/account.repository'

import type { CardRecord, CardRepository } from './card.repository'

export type CardDto = {
  id: string
  accountId: string
  label: string
  lastFourDigits: string | null
  type: CardType
  holderName: string | null
  userId: string | null
  brand: CardBrand | null
  status: string
  blockedAt: string | null
  blockedReason: CardBlockedReason | null
  canceledAt: string | null
  canceledReason: CardCanceledReason | null
  expiresAt: string | null
  isContactless: boolean
  createdAt: string
  updatedAt: string
}

function toCardDto(card: CardRecord): CardDto {
  return {
    id: card.id,
    accountId: card.accountId,
    label: card.label,
    lastFourDigits: card.lastFourDigits,
    type: card.type,
    holderName: card.holderName,
    userId: card.userId,
    brand: card.brand,
    status: card.status,
    blockedAt: card.blockedAt?.toISOString() ?? null,
    blockedReason: card.blockedReason,
    canceledAt: card.canceledAt?.toISOString() ?? null,
    canceledReason: card.canceledReason,
    expiresAt: card.expiresAt ?? null,
    isContactless: card.isContactless,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  }
}

export type CreateCardInput = {
  label: string
  type: CardType
  lastFourDigits?: string | null
  holderName?: string | null
  userId?: string | null
  brand?: CardBrand | null
  expiresAt?: string | null
  isContactless?: boolean
}

export type UpdateCardInput = Partial<CreateCardInput>

export class CardService {
  constructor(
    private readonly cards: CardRepository,
    private readonly accountRepository: AccountRepository
  ) {}

  async list(organizationId: string, accountId: string): Promise<CardDto[]> {
    await this.ensureCreditCardAccount(organizationId, accountId)
    const rows = await this.cards.findByAccountId(accountId)
    return rows.map(toCardDto)
  }

  async get(organizationId: string, accountId: string, id: string): Promise<CardDto> {
    await this.ensureCreditCardAccount(organizationId, accountId)
    const card = await this.cards.findById(accountId, id)

    if (!card) {
      throw notFound('Card not found')
    }

    return toCardDto(card)
  }

  async create(
    organizationId: string,
    accountId: string,
    input: CreateCardInput
  ): Promise<CardDto> {
    await this.ensureCreditCardAccount(organizationId, accountId)

    const created = await this.cards.create({
      accountId,
      label: input.label,
      type: input.type,
      brand: input.brand,
      holderName: input.holderName,
      userId: input.userId,
      lastFourDigits: input.lastFourDigits,
      expiresAt: input.expiresAt,
      isContactless: input.isContactless,
    })

    return toCardDto(created)
  }

  async update(
    organizationId: string,
    accountId: string,
    id: string,
    input: UpdateCardInput
  ): Promise<CardDto> {
    await this.ensureCreditCardAccount(organizationId, accountId)

    const existing = await this.cards.findById(accountId, id)

    if (!existing || existing.status === 'canceled') {
      throw notFound('Card not found')
    }

    const updated = await this.cards.update(id, {
      label: input.label,
      type: input.type,
      brand: input.brand,
      holderName: input.holderName,
      userId: input.userId,
      lastFourDigits: input.lastFourDigits,
      expiresAt: input.expiresAt,
      isContactless: input.isContactless,
    })

    if (!updated) {
      throw notFound('Card not found')
    }

    return toCardDto(updated)
  }

  async cancel(
    organizationId: string,
    accountId: string,
    id: string,
    reason?: CardCanceledReason
  ): Promise<void> {
    await this.ensureCreditCardAccount(organizationId, accountId)

    const existing = await this.cards.findById(accountId, id)

    if (!existing || existing.status === 'canceled') {
      throw notFound('Card not found')
    }

    await this.cards.setStatus(id, 'canceled', {
      canceledAt: new Date(),
      canceledReason: reason ?? 'requested',
      blockedAt: null,
      blockedReason: null,
    })
  }

  async block(
    organizationId: string,
    accountId: string,
    id: string,
    reason: CardBlockedReason
  ): Promise<CardDto> {
    await this.ensureCreditCardAccount(organizationId, accountId)

    const existing = await this.cards.findById(accountId, id)

    if (!existing || existing.status === 'canceled') {
      throw notFound('Card not found')
    }

    if (existing.status === 'blocked') {
      throw badRequest('Card is already blocked')
    }

    const updated = await this.cards.setStatus(id, 'blocked', {
      blockedAt: new Date(),
      blockedReason: reason,
    })

    if (!updated) {
      throw notFound('Card not found')
    }

    return toCardDto(updated)
  }

  async unblock(organizationId: string, accountId: string, id: string): Promise<CardDto> {
    await this.ensureCreditCardAccount(organizationId, accountId)

    const existing = await this.cards.findById(accountId, id)

    if (!existing || existing.status === 'canceled') {
      throw notFound('Card not found')
    }

    if (existing.status !== 'blocked') {
      throw badRequest('Card is not blocked')
    }

    const updated = await this.cards.setStatus(id, 'active', {
      blockedAt: null,
      blockedReason: null,
    })

    if (!updated) {
      throw notFound('Card not found')
    }

    return toCardDto(updated)
  }

  listByAccount(accountId: string): Promise<CardRecord[]> {
    return this.cards.findByAccountId(accountId)
  }

  countActiveByAccountIds(accountIds: string[]): Promise<Map<string, number>> {
    return this.cards.countActiveByAccountIds(accountIds)
  }

  findPrimaryByAccountIds(accountIds: string[]): Promise<Map<string, CardRecord>> {
    return this.cards.findPrimaryByAccountIds(accountIds)
  }

  createPrimaryCard(input: {
    accountId: string
    label: string
    brand?: CardBrand | null
    holderName?: string | null
  }): Promise<CardRecord> {
    return this.cards.create({
      accountId: input.accountId,
      label: input.label,
      type: 'physical',
      brand: input.brand ?? null,
      holderName: input.holderName ?? null,
    })
  }

  private async ensureCreditCardAccount(
    organizationId: string,
    accountId: string
  ): Promise<void> {
    const account = await this.accountRepository.findById(organizationId, accountId)

    if (!account || !account.isActive) {
      throw notFound('Account not found')
    }

    if (account.type !== 'credit_card') {
      throw badRequest('Cards can only be managed on credit_card accounts')
    }
  }
}
