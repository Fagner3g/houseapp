

import { db } from '@/db'
import { accounts, type AccountType, type PixKeyType } from '@/db/schemas/accounts'
import { cards, type CardBrand } from '@/db/schemas/cards'
import { badRequest, conflict, notFound } from '@/core/errors'
import { centavosToString, parseCentavos } from '@/core/money'
import type { CardRecord } from '@/modules/cards/card.repository'
import type { CardService } from '@/modules/cards/card.service'

import type { AccountRecord, AccountRepository } from './account.repository'
import type { SuggestedCreditCardAccount } from '@/modules/statements/nubank-ofx-parser'
import { suggestCreditCardAccountName } from './suggest-credit-card-account-name'

export type AccountDto = {
  id: string
  organizationId: string
  name: string
  type: AccountType
  institution: string | null
  currency: string
  creditLimit: string | null
  closingDay: number | null
  dueDay: number | null
  paymentAccountId: string | null
  initialBalance: string
  pixKey: string | null
  pixKeyType: PixKeyType | null
  color: string | null
  icon: string | null
  displayOrder: number
  isActive: boolean
  ofxAccountId: string | null
  createdAt: string
  updatedAt: string
  cards?: Array<{
    id: string
    label: string
    type: string
    brand: string | null
    status: string
    lastFourDigits: string | null
  }>
  cardCount?: number
}

function toAccountDto(
  account: AccountRecord,
  cardRows?: CardRecord[],
  cardCount?: number
): AccountDto {
  return {
    id: account.id,
    organizationId: account.organizationId,
    name: account.name,
    type: account.type,
    institution: account.institution,
    currency: account.currency,
    creditLimit: centavosToString(account.creditLimit),
    closingDay: account.closingDay,
    dueDay: account.dueDay,
    paymentAccountId: account.paymentAccountId,
    initialBalance: centavosToString(account.initialBalance) ?? '0.00',
    pixKey: account.pixKey,
    pixKeyType: account.pixKeyType,
    color: account.color,
    icon: account.icon,
    displayOrder: account.displayOrder,
    isActive: account.isActive,
    ofxAccountId: account.ofxAccountId,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    ...(cardRows
      ? {
          cards: cardRows.map(card => ({
            id: card.id,
            label: card.label,
            type: card.type,
            brand: card.brand,
            status: card.status,
            lastFourDigits: card.lastFourDigits,
          })),
        }
      : {}),
    ...(cardCount != null ? { cardCount } : {}),
  }
}

export type CreateAccountInput = {
  organizationId: string
  name: string
  type: AccountType
  institution?: string | null
  currency?: string
  creditLimit?: string | null
  closingDay?: number | null
  dueDay?: number | null
  paymentAccountId?: string | null
  initialBalance?: string | null
  pixKey?: string | null
  pixKeyType?: PixKeyType | null
  color?: string | null
  icon?: string | null
  displayOrder?: number
  brand?: CardBrand | null
  holderName?: string | null
  ofxAccountId?: string | null
  lastFourDigits?: string | null
}

export type UpdateAccountInput = Partial<
  Omit<CreateAccountInput, 'organizationId' | 'type' | 'brand' | 'holderName'>
>

export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly cardService: CardService
  ) {}

  async list(organizationId: string): Promise<AccountDto[]> {
    const rows = await this.accountRepository.findAllByOrganization(organizationId)
    const creditCardIds = rows.filter(row => row.type === 'credit_card').map(row => row.id)
    const [cardCounts, primaryCards] = await Promise.all([
      creditCardIds.length > 0
        ? this.cardService.countActiveByAccountIds(creditCardIds)
        : Promise.resolve(new Map<string, number>()),
      creditCardIds.length > 0
        ? this.cardService.findPrimaryByAccountIds(creditCardIds)
        : Promise.resolve(new Map()),
    ])

    return rows.map(row => {
      const primaryCard = row.type === 'credit_card' ? primaryCards.get(row.id) : undefined

      return toAccountDto(
        row,
        primaryCard ? [primaryCard] : undefined,
        row.type === 'credit_card' ? cardCounts.get(row.id) ?? 0 : undefined
      )
    })
  }

  async get(organizationId: string, id: string): Promise<AccountDto> {
    const account = await this.accountRepository.findById(organizationId, id)

    if (!account || !account.isActive) {
      throw notFound('Account not found')
    }

    const cardRows =
      account.type === 'credit_card'
        ? await this.cardService.listByAccount(account.id)
        : undefined

    return toAccountDto(account, cardRows)
  }

  async create(input: CreateAccountInput): Promise<AccountDto> {
    const existing = await this.accountRepository.findByName(input.organizationId, input.name)

    if (existing?.isActive) {
      throw conflict('Já existe uma conta com este nome')
    }

    if (input.type === 'credit_card') {
      this.validateCreditCardFields(input)
      await this.validatePaymentAccount(input.organizationId, undefined, input.paymentAccountId)
    }

    const creditLimit = input.creditLimit ? parseCentavos(input.creditLimit) : null
    const initialBalance = input.initialBalance ? parseCentavos(input.initialBalance) : 0n

    const result = await db.transaction(async tx => {
      const [account] = await tx
        .insert(accounts)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          type: input.type,
          institution: input.institution ?? null,
          currency: input.currency ?? 'BRL',
          creditLimit,
          closingDay: input.closingDay ?? null,
          dueDay: input.dueDay ?? null,
          paymentAccountId: input.type === 'credit_card' ? (input.paymentAccountId ?? null) : null,
          initialBalance,
          pixKey: input.pixKey ?? null,
          pixKeyType: input.pixKeyType ?? null,
          color: input.color ?? null,
          icon: input.icon ?? null,
          displayOrder: input.displayOrder ?? 0,
          ofxAccountId: input.ofxAccountId ?? null,
        })
        .returning()

      let cardRows: CardRecord[] | undefined

      if (input.type === 'credit_card') {
        const [primaryCard] = await tx
          .insert(cards)
          .values({
            accountId: account.id,
            label: input.name,
            type: 'physical',
            brand: input.brand ?? null,
            holderName: input.holderName ?? null,
            lastFourDigits: input.lastFourDigits ?? null,
          })
          .returning()

        cardRows = [primaryCard]
      }

      return { account, cardRows }
    })

    return toAccountDto(result.account, result.cardRows)
  }

  async provisionFromOfxSuggestion(
    organizationId: string,
    ofxAccountId: string,
    suggested: SuggestedCreditCardAccount,
    orgAccounts: AccountRecord[]
  ): Promise<AccountDto> {
    if (suggested.closingDay == null || suggested.dueDay == null) {
      throw badRequest('Não foi possível inferir fechamento e vencimento do OFX')
    }

    const paymentAccount = orgAccounts.find(
      account =>
        account.institution === suggested.institution &&
        ['checking', 'savings', 'cash'].includes(account.type)
    )

    const existingByOfx = await this.accountRepository.findByOfxAccountId(
      organizationId,
      ofxAccountId
    )

    if (existingByOfx) {
      if (existingByOfx.isActive) {
        return toAccountDto(existingByOfx)
      }

      const creditLimit =
        existingByOfx.creditLimit == null || existingByOfx.creditLimit === 0n
          ? suggested.creditLimit
            ? parseCentavos(suggested.creditLimit)
            : 0n
          : undefined

      const updated = await this.accountRepository.update(existingByOfx.id, {
        isActive: true,
        closingDay: suggested.closingDay,
        dueDay: suggested.dueDay,
        paymentAccountId: paymentAccount?.id ?? existingByOfx.paymentAccountId,
        institution: suggested.institution,
        ...(creditLimit !== undefined ? { creditLimit } : {}),
      })

      if (!updated) {
        throw notFound('Account not found')
      }

      const cardRows =
        updated.type === 'credit_card'
          ? await this.cardService.listByAccount(updated.id)
          : undefined

      return toAccountDto(updated, cardRows)
    }

    const allAccounts = await this.accountRepository.findAllByOrganizationIncludingInactive(
      organizationId
    )
    const name = suggestCreditCardAccountName(
      suggested.name,
      suggested.institution,
      allAccounts
    )

    return this.create({
      organizationId,
      name,
      type: 'credit_card',
      institution: suggested.institution,
      currency: suggested.currency,
      creditLimit: suggested.creditLimit ?? '0.00',
      closingDay: suggested.closingDay,
      dueDay: suggested.dueDay,
      paymentAccountId: paymentAccount?.id ?? null,
      ofxAccountId,
    })
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateAccountInput
  ): Promise<AccountDto> {
    const account = await this.accountRepository.findById(organizationId, id)

    if (!account || !account.isActive) {
      throw notFound('Account not found')
    }

    if (input.name && input.name !== account.name) {
      const duplicate = await this.accountRepository.findByName(organizationId, input.name)
      if (duplicate && duplicate.id !== id && duplicate.isActive) {
        throw conflict('Já existe uma conta com este nome')
      }
    }

    if (input.paymentAccountId !== undefined && account.type === 'credit_card') {
      await this.validatePaymentAccount(organizationId, id, input.paymentAccountId)
    }

    if (account.type === 'investment') {
      const nextInstitution =
        input.institution !== undefined ? input.institution : account.institution
      if (!nextInstitution?.trim()) {
        throw badRequest('Investment accounts require an institution')
      }
    }

    const updated = await this.accountRepository.update(id, {
      name: input.name,
      institution: input.institution,
      currency: input.currency,
      creditLimit: input.creditLimit != null ? parseCentavos(input.creditLimit) : undefined,
      closingDay: input.closingDay,
      dueDay: input.dueDay,
      paymentAccountId:
        account.type === 'credit_card' ? input.paymentAccountId : undefined,
      initialBalance:
        input.initialBalance != null ? parseCentavos(input.initialBalance) : undefined,
      pixKey: input.pixKey,
      pixKeyType: input.pixKeyType,
      color: input.color,
      icon: input.icon,
      displayOrder: input.displayOrder,
    })

    if (!updated) {
      throw notFound('Account not found')
    }

    return toAccountDto(updated)
  }

  async delete(organizationId: string, id: string): Promise<void> {
    const account = await this.accountRepository.findById(organizationId, id)

    if (!account || !account.isActive) {
      throw notFound('Account not found')
    }

    await this.accountRepository.softDelete(id)
  }

  private validateCreditCardFields(input: CreateAccountInput): void {
    if (input.creditLimit == null) {
      throw badRequest('creditLimit is required for credit_card accounts')
    }

    if (input.closingDay == null || input.dueDay == null) {
      throw badRequest('closingDay and dueDay are required for credit_card accounts')
    }
  }

  private async validatePaymentAccount(
    organizationId: string,
    creditCardAccountId: string | undefined,
    paymentAccountId: string | null | undefined
  ): Promise<void> {
    if (paymentAccountId == null) return

    if (creditCardAccountId && paymentAccountId === creditCardAccountId) {
      throw badRequest('Payment account cannot be the credit card account')
    }

    const paymentAccount = await this.accountRepository.findById(organizationId, paymentAccountId)

    if (!paymentAccount || !paymentAccount.isActive) {
      throw badRequest('Payment account not found')
    }

    if (!['checking', 'savings', 'cash'].includes(paymentAccount.type)) {
      throw badRequest('Payment account must be checking, savings, or cash')
    }
  }
}
