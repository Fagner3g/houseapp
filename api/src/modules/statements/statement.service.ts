import { eq } from 'drizzle-orm'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

import { db } from '@/db'
import { cards } from '@/db/schemas/cards'
import { badRequest, conflict, notFound } from '@/core/errors'
import { billingDaysFromStatementDates } from '@/core/billing-cycle'
import { centavosToString, parseCentavos } from '@/core/money'
import type { AccountRecord, AccountRepository } from '@/modules/accounts/account.repository'
import { suggestCreditCardAccountName } from '@/modules/accounts/suggest-credit-card-account-name'
import type { CategoryRepository } from '@/modules/categories/category.repository'
import type { CardRepository } from '@/modules/cards/card.repository'
import type { TransactionRepository } from '@/modules/transactions/transaction.repository'
import type { TransactionViewer } from '@/modules/transactions/transaction-visibility'

import { stripSharedAccessInvoiceTotals } from './strip-shared-access-invoice-totals'
import type {
  ImportTransactionData,
  StatementRecord,
  StatementRepository,
} from './statement.repository'
import type { ImportStatementBody } from './statement.schema'
import {
  buildStatementImportSummary,
  type StatementImportSummary,
} from './statement-import-summary'
import {
  categorizeStatementTransactions,
  countCategorizedTransactions,
} from './statement-categorizer'
import {
  countInferredSplits,
  inferStatementSplits,
} from './statement-split-inferrer'
import { loadCategorizationHistory } from './categorization-history'
import { parseItauXlsx } from './itau-xlsx'
import { buildItauSuggestedAccount } from './itau-xlsx/suggested-account'
import { parseNubankOfx, type SuggestedCreditCardAccount } from './nubank-ofx-parser'
import {
  computeStatementPaymentRemaining,
  detectInvoiceStatus,
  type InvoiceStatusDetection,
} from './invoice-status'
import { annotateTransactionDuplicates } from './statement-duplicate-detection'
import { resolveImportedSummaryForImport } from './statement-invoice-summary'
import { resolveOfxAccountForUpload as resolveOfxAccountUpload } from './statement-ofx-account-resolution'
import { resolveXlsxAccountForUpload } from './statement-xlsx-account-resolution'

dayjs.extend(utc)

export type StatementDuplicateCheck = {
  isDuplicate: boolean
  mode: 'new' | 'update' | 'blocked'
  matchType: 'file_hash' | 'due_date' | null
  existingStatement: StatementDto | null
  newTransactionsCount: number
  duplicateTransactionsCount: number
}

export type ParseStatementFileResult = {
  parsed: ImportStatementBody
  provider: 'ofx' | 'xlsx'
  transactionsCount: number
  extractedTextLength: number
  categorizedCount: number
  splitsInferredCount: number
  summary: StatementImportSummary
  duplicate: StatementDuplicateCheck
  invoiceStatus: InvoiceStatusDetection
  cardMismatchWarning?: string | null
}

export type StatementAccountResolution =
  | {
      mode: 'existing'
      accountId: string
      accountName: string
      autoProvisioned?: boolean
      autoReactivated?: boolean
    }
  | {
      mode: 'missing'
      suggestedAccount: SuggestedCreditCardAccount
      uploadedOnAccountName?: string
      ofxAccountId?: string
      cardLastFour?: string
    }
  | {
      mode: 'mismatch'
      expectedAccountId: string
      expectedAccountName: string
      uploadedOnAccountId: string
      uploadedOnAccountName: string
      ofxAccountId?: string
      cardLastFour?: string
    }

/** @deprecated Use StatementAccountResolution */
export type OfxAccountResolution = StatementAccountResolution

export type ParseStatementWithResolutionResult = ParseStatementFileResult & {
  accountResolution: StatementAccountResolution
}

export type ParseStatementOfxResult = ParseStatementWithResolutionResult
export type ParseStatementXlsxResult = ParseStatementWithResolutionResult

export type StatementDto = {
  id: string
  accountId: string
  organizationId: string
  periodStart: string | null
  periodEnd: string | null
  closingDate: string | null
  dueDate: string | null
  totalAmount: string | null
  minimumPayment: string | null
  previousBalance: string | null
  paymentsReceived: string | null
  purchasesTotal: string | null
  otherCharges: string | null
  nextInvoiceBalance: string | null
  totalOpenBalance: string | null
  transactionsCount: number
  fileHash: string
  fileName: string | null
  importSource: 'pdf' | 'csv' | 'ofx' | 'xlsx' | null
  isClosed: boolean
  isPaid: boolean
  importedBy: string | null
  importedAt: string
}

function toStatementDto(statement: StatementRecord): StatementDto {
  return {
    id: statement.id,
    accountId: statement.accountId,
    organizationId: statement.organizationId,
    periodStart: statement.periodStart?.toISOString() ?? null,
    periodEnd: statement.periodEnd?.toISOString() ?? null,
    closingDate: statement.closingDate?.toISOString() ?? null,
    dueDate: statement.dueDate?.toISOString() ?? null,
    totalAmount: centavosToString(statement.totalAmount),
    minimumPayment: centavosToString(statement.minimumPayment),
    previousBalance: centavosToString(statement.previousBalance),
    paymentsReceived: centavosToString(statement.paymentsReceived),
    purchasesTotal: centavosToString(statement.purchasesTotal),
    otherCharges: centavosToString(statement.otherCharges),
    nextInvoiceBalance: centavosToString(statement.nextInvoiceBalance),
    totalOpenBalance: centavosToString(statement.totalOpenBalance),
    transactionsCount: statement.transactionsCount,
    fileHash: statement.fileHash,
    fileName: statement.fileName,
    importSource: statement.importSource ?? null,
    isClosed: statement.isClosed,
    isPaid: statement.isPaid,
    importedBy: statement.importedBy,
    importedAt: statement.importedAt.toISOString(),
  }
}

export class StatementService {
  constructor(
    private readonly statementRepository: StatementRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly cardRepository: CardRepository
  ) {}

  async list(
    organizationId: string,
    accountId: string,
    viewer?: TransactionViewer
  ): Promise<StatementDto[]> {
    await this.ensureAccount(organizationId, accountId, viewer)

    const rows = await this.statementRepository.findByAccountId(organizationId, accountId)
    const showFullTotals = await this.canShowFullInvoiceTotals(organizationId, accountId, viewer)
    return rows.map(row => {
      const dto = toStatementDto(row)
      return showFullTotals ? dto : stripSharedAccessInvoiceTotals(dto)
    })
  }

  async get(
    organizationId: string,
    accountId: string,
    id: string,
    viewer?: TransactionViewer
  ): Promise<StatementDto> {
    await this.ensureAccount(organizationId, accountId, viewer)

    const statement = await this.statementRepository.findById(organizationId, accountId, id)

    if (!statement) {
      throw notFound('Statement not found')
    }

    const dto = toStatementDto(statement)
    const showFullTotals = await this.canShowFullInvoiceTotals(organizationId, accountId, viewer)
    return showFullTotals ? dto : stripSharedAccessInvoiceTotals(dto)
  }

  async import(
    organizationId: string,
    accountId: string,
    importedBy: string,
    input: ImportStatementBody
  ): Promise<{
    statement: StatementDto
    transactionsCreated: number
    transactionsSkipped: number
    transactionIds: string[]
  }> {
    const account = await this.ensureAccount(organizationId, accountId)

    const isClosed = input.isClosed ?? false
    const isPaid = input.isPaid ?? false

    if (isPaid && !isClosed) {
      throw badRequest('Somente faturas fechadas podem ser marcadas como pagas')
    }

    if (isPaid) {
      const periodEnd = new Date(input.periodEnd)
      const dueDateForRemaining = new Date(input.dueDate)
      const totalAmount = parseCentavos(input.totalAmount)
      const mappedForRemaining = input.transactions.map(item => ({
        type: (item.type ?? 'expense') as 'income' | 'expense',
        amount: parseCentavos(item.amount),
        date: new Date(item.date),
      }))
      const remaining = computeStatementPaymentRemaining(
        totalAmount,
        mappedForRemaining,
        periodEnd,
        dueDateForRemaining
      )

      if (remaining > 0n) {
        const paymentSourceAccountId =
          input.paymentSourceAccountId ?? account.paymentAccountId ?? undefined

        if (!paymentSourceAccountId) {
          throw badRequest('Informe a conta bancária de origem do pagamento')
        }

        if (paymentSourceAccountId === accountId) {
          throw badRequest('A conta de origem do pagamento não pode ser o próprio cartão')
        }

        const sourceAccount = await this.accountRepository.findById(
          organizationId,
          paymentSourceAccountId
        )

        if (!sourceAccount || !sourceAccount.isActive) {
          throw badRequest('Conta bancária de origem não encontrada')
        }

        if (sourceAccount.type === 'credit_card') {
          throw badRequest('Selecione uma conta bancária para o pagamento')
        }
      }
    }

    const existing = await this.statementRepository.findByFileHash(accountId, input.fileHash)

    if (existing) {
      throw conflict('Statement with this file hash already imported for this account')
    }

    const dueDate = new Date(input.dueDate)

    if (input.importSource === 'ofx' || input.importSource === 'xlsx') {
      await this.syncAccountBillingCycleFromStatement(account, {
        closingDate: new Date(input.closingDate),
        dueDate,
      })
    }

    const cardMap = await this.buildCardMap(accountId)
    const transactionsData = await this.mapTransactions(organizationId, input.transactions, cardMap)

    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : dueDate
    const paymentTitle = `Pagamento Fatura ${account.name} — ${dayjs(input.dueDate).utc().format('MM/YYYY')}`

    const summary = resolveImportedSummaryForImport({
      isClosed,
      totalAmount: input.totalAmount,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      dueDate: input.dueDate,
      transactions: input.transactions.map(tx => ({
        type: (tx.type ?? 'expense') as 'income' | 'expense',
        amount: tx.amount,
        date: tx.date,
      })),
      previousBalance: input.previousBalance,
      purchasesTotal: input.purchasesTotal,
      paymentsReceived: input.paymentsReceived,
    })

    const statementData = {
      accountId,
      organizationId,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
      closingDate: new Date(input.closingDate),
      dueDate,
      totalAmount: parseCentavos(input.totalAmount),
      minimumPayment:
        input.minimumPayment != null ? parseCentavos(input.minimumPayment) : null,
      previousBalance:
        summary.previousBalance != null ? parseCentavos(summary.previousBalance) : null,
      paymentsReceived:
        summary.paymentsReceived != null ? parseCentavos(summary.paymentsReceived) : null,
      purchasesTotal:
        summary.purchasesTotal != null ? parseCentavos(summary.purchasesTotal) : null,
      otherCharges: input.otherCharges != null ? parseCentavos(input.otherCharges) : null,
      nextInvoiceBalance:
        input.nextInvoiceBalance != null ? parseCentavos(input.nextInvoiceBalance) : null,
      totalOpenBalance:
        input.totalOpenBalance != null ? parseCentavos(input.totalOpenBalance) : null,
      fileHash: input.fileHash,
      fileName: input.fileName,
      importSource: input.importSource ?? null,
      isClosed,
      isPaid,
      importedBy,
    }

    const paymentOptions = isClosed
      ? {
          isClosed,
          isPaid,
          createSyntheticPayment: false,
          paymentSourceAccountId: null,
          paymentDate,
          paymentTitle,
        }
      : undefined

    const existingByDueDate = await this.statementRepository.findByDueDate(accountId, dueDate)

    if (existingByDueDate && isClosed && existingByDueDate.isClosed) {
      throw conflict('Uma fatura fechada com este vencimento já foi importada nesta conta')
    }

    const importContext =
      (input.importSource === 'ofx' || input.importSource === 'xlsx') && isClosed
        ? {
            previousStatement: await this.statementRepository.findPreviousStatementByPeriodEnd(
              accountId,
              new Date(input.periodStart)
            ),
            reconcileCrossInvoice: true,
          }
        : undefined

    const result = existingByDueDate
      ? await this.statementRepository.mergeIntoStatement(
          existingByDueDate.id,
          statementData,
          transactionsData,
          paymentOptions,
          importContext
        )
      : await this.statementRepository.importStatement(
          statementData,
          transactionsData,
          paymentOptions,
          importContext
        )

    if (input.importSource === 'ofx' || input.importSource === 'xlsx') {
      await this.statementRepository.reconcileCrossInvoicePayments(accountId)
    }

    const refreshed =
      (await this.statementRepository.findById(
        organizationId,
        accountId,
        result.statement.id
      )) ?? result.statement

    return {
      statement: toStatementDto(refreshed),
      transactionsCreated: result.created,
      transactionsSkipped: result.skipped,
      transactionIds: result.transactionIds,
    }
  }

  async parseXlsx(
    organizationId: string,
    accountId: string,
    userId: string,
    buffer: Buffer,
    fileName: string
  ): Promise<ParseStatementXlsxResult> {
    const account = await this.ensureAccount(organizationId, accountId)

    const result = parseItauXlsx({
      buffer,
      fileName,
      closingDay: account.closingDay,
      dueDay: account.dueDay,
    })

    const cardMap = await this.buildCardMap(accountId)
    const cardOnTargetAccount = result.cardLastFour ? cardMap.has(result.cardLastFour) : true
    const ownerByCard = result.cardLastFour
      ? await this.cardRepository.findActiveAccountByLastFourDigits(
          organizationId,
          result.cardLastFour
        )
      : null

    const uploadResolution = resolveXlsxAccountForUpload(
      { id: account.id, name: account.name },
      result.cardLastFour,
      cardOnTargetAccount,
      ownerByCard
    )

    let accountResolution: StatementAccountResolution

    if (uploadResolution.mode === 'missing') {
      const allAccounts =
        await this.accountRepository.findAllByOrganizationIncludingInactive(organizationId)
      const suggested = buildItauSuggestedAccount({
        cardName: result.cardName,
        cardLastFour: result.cardLastFour,
        closingDate: result.parsed.closingDate,
        dueDate: result.parsed.dueDate,
      })

      accountResolution = {
        mode: 'missing',
        cardLastFour: uploadResolution.cardLastFour,
        suggestedAccount: {
          ...suggested,
          name: suggestCreditCardAccountName(
            suggested.name,
            suggested.institution,
            allAccounts
          ),
        },
        uploadedOnAccountName: account.name,
      }
    } else {
      accountResolution = uploadResolution
    }

    const enrichAccountId =
      accountResolution.mode === 'existing'
        ? accountResolution.accountId
        : accountResolution.mode === 'missing'
          ? '__pending_xlsx_account__'
          : accountResolution.mode === 'mismatch'
            ? accountResolution.expectedAccountId
            : accountId

    const enriched = await this.enrichParsedStatement(organizationId, enrichAccountId, userId, result.parsed, {
      provider: 'xlsx',
      xlsxVariant: result.invoiceKind,
      extractedTextLength: buffer.length,
      transactionsCount: result.transactionsCount,
      skipDuplicateCheck: accountResolution.mode === 'missing',
    })

    return {
      ...enriched,
      accountResolution,
    }
  }

  async parseOfx(
    organizationId: string,
    accountId: string,
    userId: string,
    content: string,
    fileName: string
  ): Promise<ParseStatementOfxResult> {
    const account = await this.ensureAccount(organizationId, accountId)

    const result = parseNubankOfx({
      content,
      fileName,
      closingDay: account.closingDay,
      dueDay: account.dueDay,
    })

    const ownerByOfx = await this.accountRepository.findByOfxAccountId(
      organizationId,
      result.ofxAccountId
    )

    let accountResolution: StatementAccountResolution

    if (
      !ownerByOfx?.isActive &&
      account.ofxAccountId &&
      account.ofxAccountId !== result.ofxAccountId
    ) {
      const allAccounts =
        await this.accountRepository.findAllByOrganizationIncludingInactive(organizationId)

      accountResolution = {
        mode: 'missing',
        ofxAccountId: result.ofxAccountId,
        suggestedAccount: {
          ...result.suggestedAccount,
          name: suggestCreditCardAccountName(
            result.suggestedAccount.name,
            result.suggestedAccount.institution,
            allAccounts
          ),
        },
        uploadedOnAccountName: account.name,
      }
    } else {
      accountResolution = this.toOfxAccountResolution(
        resolveOfxAccountUpload(account, result.ofxAccountId, ownerByOfx)
      )

      if (accountResolution.mode === 'existing' && !account.ofxAccountId) {
        await this.accountRepository.update(account.id, { ofxAccountId: result.ofxAccountId })
      }
    }

    const enrichAccountId =
      accountResolution.mode === 'existing'
        ? accountResolution.accountId
        : accountResolution.mode === 'missing'
          ? '__pending_ofx_account__'
          : accountResolution.mode === 'mismatch'
            ? accountResolution.expectedAccountId
            : accountId

    const enriched = await this.enrichParsedStatement(
      organizationId,
      enrichAccountId,
      userId,
      result.parsed,
      {
      provider: 'ofx',
      extractedTextLength: content.length,
      transactionsCount: result.transactionsCount,
      skipDuplicateCheck: accountResolution.mode === 'missing',
    })

    return {
      ...enriched,
      accountResolution,
    }
  }

  async parseOfxForOrganization(
    organizationId: string,
    userId: string,
    content: string,
    fileName: string
  ): Promise<ParseStatementOfxResult> {
    const result = parseNubankOfx({ content, fileName })

    const existing = await this.accountRepository.findByOfxAccountId(
      organizationId,
      result.ofxAccountId
    )

    const allAccounts = await this.accountRepository.findAllByOrganizationIncludingInactive(
      organizationId
    )

    const accountResolution: OfxAccountResolution =
      existing?.isActive
        ? {
            mode: 'existing',
            accountId: existing.id,
            accountName: existing.name,
          }
        : {
            mode: 'missing',
            ofxAccountId: result.ofxAccountId,
            suggestedAccount: {
              ...result.suggestedAccount,
              name: suggestCreditCardAccountName(
                result.suggestedAccount.name,
                result.suggestedAccount.institution,
                allAccounts
              ),
            },
          }

    const accountId = accountResolution.mode === 'existing' ? accountResolution.accountId : undefined

    const enriched = await this.enrichParsedStatement(
      organizationId,
      accountId ?? '__pending_ofx_account__',
      userId,
      result.parsed,
      {
        provider: 'ofx',
        extractedTextLength: content.length,
        transactionsCount: result.transactionsCount,
        skipDuplicateCheck: accountId == null,
      }
    )

    return {
      ...enriched,
      accountResolution,
    }
  }

  private toOfxAccountResolution(
    resolution: ReturnType<typeof resolveOfxAccountUpload>
  ): StatementAccountResolution {
    if (resolution.mode === 'mismatch') {
      return resolution
    }

    return {
      mode: 'existing',
      accountId: resolution.accountId,
      accountName: resolution.accountName,
    }
  }

  private async enrichParsedStatement(
    organizationId: string,
    accountId: string,
    userId: string,
    baseParsed: ImportStatementBody,
    meta: {
      provider: ParseStatementFileResult['provider']
      extractedTextLength: number
      transactionsCount: number
      skipDuplicateCheck?: boolean
      xlsxVariant?: 'paid' | 'open'
    }
  ): Promise<ParseStatementFileResult> {
    const categories = await this.categoryRepository.findAllByOrganization(organizationId)
    const categoryRows = categories.map(category => ({
      id: category.id,
      name: category.name,
      type: category.type,
    }))
    const categoryNameById = new Map(categoryRows.map(category => [category.id, category.name]))
    const historicalExamples = await loadCategorizationHistory(
      this.transactionRepository,
      organizationId,
      accountId,
      categoryNameById
    )
    const categorizedTransactions = await categorizeStatementTransactions(
      baseParsed.transactions,
      categoryRows,
      { historicalExamples }
    )

    const transactionsWithSplits = await inferStatementSplits(
      accountId,
      userId,
      categorizedTransactions
    )

    const externalIds = transactionsWithSplits
      .map(tx => tx.externalId)
      .filter((id): id is string => !!id)

    let annotatedTransactions = transactionsWithSplits

    if (!meta.skipDuplicateCheck) {
      const existingExternalIds = await this.statementRepository.findExistingExternalIds(
        accountId,
        externalIds
      )

      const duplicateCandidates = await this.statementRepository.findPotentialDuplicates(
        accountId,
        transactionsWithSplits.map(tx => ({
          amount: parseCentavos(tx.amount),
          date: new Date(tx.date),
        }))
      )

      annotatedTransactions = annotateTransactionDuplicates(
        transactionsWithSplits,
        existingExternalIds,
        duplicateCandidates.map(row => ({
          id: row.id,
          title: row.title,
          amount: row.amount ?? 0n,
          date: row.date,
          externalId: row.externalId,
        }))
      )
    }

    const parsed: ImportStatementBody = {
      ...baseParsed,
      transactions: annotatedTransactions,
    }

    const invoiceStatus = detectInvoiceStatus({
      provider: meta.provider,
      totalAmount: parsed.totalAmount,
      periodEnd: parsed.periodEnd,
      dueDate: parsed.dueDate,
      xlsxVariant: meta.xlsxVariant,
      transactions: parsed.transactions.map(tx => ({
        type: (tx.type ?? 'expense') as 'income' | 'expense',
        amount: tx.amount,
        date: tx.date,
      })),
    })

    parsed.importSource = invoiceStatus.importSource
    parsed.isClosed = invoiceStatus.defaultIsClosed
    parsed.isPaid = invoiceStatus.defaultIsPaid

    const duplicate = meta.skipDuplicateCheck
      ? {
          isDuplicate: false,
          mode: 'new' as const,
          matchType: null,
          existingStatement: null,
          newTransactionsCount: annotatedTransactions.length,
          duplicateTransactionsCount: 0,
        }
      : await this.checkDuplicate(organizationId, accountId, parsed, {
          newTransactionsCount: annotatedTransactions.filter(tx => !tx.isDuplicate).length,
          duplicateTransactionsCount: annotatedTransactions.filter(tx => tx.isDuplicate).length,
        })

    return {
      provider: meta.provider,
      transactionsCount: meta.transactionsCount,
      extractedTextLength: meta.extractedTextLength,
      parsed,
      categorizedCount: countCategorizedTransactions(transactionsWithSplits),
      splitsInferredCount: countInferredSplits(transactionsWithSplits),
      summary: buildStatementImportSummary(parsed, categories),
      duplicate,
      invoiceStatus,
    }
  }

  private async checkDuplicate(
    _organizationId: string,
    accountId: string,
    parsed: ImportStatementBody,
    counts: { newTransactionsCount: number; duplicateTransactionsCount: number }
  ): Promise<StatementDuplicateCheck> {
    const byHash = await this.statementRepository.findByFileHash(accountId, parsed.fileHash)

    if (byHash) {
      return {
        isDuplicate: true,
        mode: 'blocked',
        matchType: 'file_hash',
        existingStatement: toStatementDto(byHash),
        newTransactionsCount: counts.newTransactionsCount,
        duplicateTransactionsCount: counts.duplicateTransactionsCount,
      }
    }

    const dueDate = new Date(parsed.dueDate)
    const existingStatement = await this.statementRepository.findByDueDate(accountId, dueDate)

    if (existingStatement) {
      const parsedClosed = parsed.isClosed ?? false
      const existingClosed = existingStatement.isClosed ?? false

      if (!parsedClosed || !existingClosed) {
        return {
          isDuplicate: false,
          mode: 'update',
          matchType: 'due_date',
          existingStatement: toStatementDto(existingStatement),
          newTransactionsCount: counts.newTransactionsCount,
          duplicateTransactionsCount: counts.duplicateTransactionsCount,
        }
      }

      return {
        isDuplicate: true,
        mode: 'blocked',
        matchType: 'due_date',
        existingStatement: toStatementDto(existingStatement),
        newTransactionsCount: counts.newTransactionsCount,
        duplicateTransactionsCount: counts.duplicateTransactionsCount,
      }
    }

    return {
      isDuplicate: false,
      mode: 'new',
      matchType: null,
      existingStatement: null,
      newTransactionsCount: counts.newTransactionsCount,
      duplicateTransactionsCount: counts.duplicateTransactionsCount,
    }
  }

  private async ensureAccount(
    organizationId: string,
    accountId: string,
    viewer?: TransactionViewer
  ) {
    const account = await this.accountRepository.findById(organizationId, accountId, viewer)

    if (!account || !account.isActive) {
      throw notFound('Account not found')
    }

    return account
  }

  /** Permanent account holders see imported totals; split-only access does not. */
  private async canShowFullInvoiceTotals(
    organizationId: string,
    accountId: string,
    viewer?: TransactionViewer
  ): Promise<boolean> {
    if (!viewer) return true
    const owned = await this.accountRepository.findById(organizationId, accountId, viewer, {
      ownedOnly: true,
    })
    return owned != null
  }

  private async buildCardMap(accountId: string): Promise<Map<string, string>> {
    const accountCards = await db
      .select({ id: cards.id, lastFourDigits: cards.lastFourDigits })
      .from(cards)
      .where(eq(cards.accountId, accountId))

    const map = new Map<string, string>()

    for (const card of accountCards) {
      if (card.lastFourDigits) {
        map.set(card.lastFourDigits, card.id)
      }
    }

    return map
  }

  private async mapTransactions(
    organizationId: string,
    items: ImportStatementBody['transactions'],
    cardMap: Map<string, string>
  ): Promise<ImportTransactionData[]> {
    const mapped: ImportTransactionData[] = []

    for (const item of items) {
      let cardId: string | null = null

      if (item.cardLastFour) {
        cardId = cardMap.get(item.cardLastFour) ?? null

        if (!cardId) {
          throw badRequest(`Card with last four digits ${item.cardLastFour} not found on account`)
        }
      }

      if (item.categoryIds?.length) {
        for (const categoryId of item.categoryIds) {
          const category = await this.categoryRepository.findById(organizationId, categoryId)

          if (!category || !category.isActive) {
            throw badRequest(`Category not found: ${categoryId}`)
          }
        }
      }

      mapped.push({
        title: item.title,
        amount: parseCentavos(item.amount),
        type: item.type ?? 'expense',
        date: new Date(item.date),
        competenceDate: item.competenceDate ? new Date(item.competenceDate) : null,
        cardId,
        installmentNumber: item.installmentNumber ?? null,
        installmentsTotal: item.installmentsTotal ?? null,
        externalId: item.externalId ?? null,
        categoryIds: item.categoryIds,
        counterparty: item.counterparty ?? null,
      })
    }

    return mapped
  }

  /** Closed invoice imports are authoritative — keep account billing days in sync with the bank. */
  private async syncAccountBillingCycleFromStatement(
    account: AccountRecord,
    dates: { closingDate: Date; dueDate: Date }
  ) {
    if (account.type !== 'credit_card') return

    const { closingDay, dueDay } = billingDaysFromStatementDates(
      dates.closingDate,
      dates.dueDate
    )

    if (account.closingDay === closingDay && account.dueDay === dueDay) return

    await this.accountRepository.update(account.id, { closingDay, dueDay })
  }
}
