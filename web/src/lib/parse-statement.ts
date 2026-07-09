import type { ImportStatementBody } from '@/api/generated/model'
import { getAuthToken } from '@/lib/auth'
import { env } from '@/lib/env'

export type StatementImportSummary = {
  expensesCount: number
  expensesTotal: string
  incomeCount: number
  incomeTotal: string
  installmentCount: number
  categorizedCount: number
  splitsInferredCount: number
  previewTransactions: Array<{
    title: string
    amount: string
    date: string
    type: 'income' | 'expense'
    installmentLabel?: string
    categoryId?: string
    categoryName?: string
  }>
}

export type StatementDuplicateCheck = {
  isDuplicate: boolean
  mode: 'new' | 'update' | 'blocked'
  matchType: 'file_hash' | 'due_date' | null
  existingStatement: {
    id: string
    fileName: string | null
    importedAt: string
    totalAmount: string | null
    dueDate: string | null
    periodStart: string | null
    periodEnd: string | null
  } | null
  newTransactionsCount: number
  duplicateTransactionsCount: number
}

export type StatementInvoiceStatus = {
  kind?: 'partial' | 'closed_unpaid' | 'closed_paid'
  detectedClosed: boolean | null
  closedConfidence: 'high' | 'manual'
  suggestedPaid: boolean
  suggestedPaidReason: string
  importSource: 'ofx' | 'xlsx'
  defaultIsClosed: boolean
  defaultIsPaid: boolean
}

export type ParseStatementFileResponse = {
  parsed: ImportStatementBody
  provider: 'ofx' | 'xlsx'
  transactionsCount: number
  extractedTextLength: number
  categorizedCount: number
  splitsInferredCount: number
  summary: StatementImportSummary
  duplicate: StatementDuplicateCheck
  invoiceStatus: StatementInvoiceStatus
  cardMismatchWarning?: string | null
}

export type SuggestedCreditCardAccount = {
  name: string
  institution: string
  currency: string
  closingDay: number
  dueDay: number | null
  creditLimit?: string | null
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

export type ParseStatementWithResolutionResponse = ParseStatementFileResponse & {
  accountResolution: StatementAccountResolution
}

export type ParseStatementOfxResponse = ParseStatementWithResolutionResponse
export type ParseStatementXlsxResponse = ParseStatementWithResolutionResponse

export function hasStatementAccountResolution(
  value: ParseStatementFileResponse
): value is ParseStatementWithResolutionResponse {
  return 'accountResolution' in value
}

/** @deprecated Use hasStatementAccountResolution */
export function isParseStatementOfxResponse(
  value: ParseStatementFileResponse
): value is ParseStatementOfxResponse {
  return hasStatementAccountResolution(value)
}

async function uploadStatementFile(
  url: URL,
  file: File,
  errorLabel: string
): Promise<ParseStatementFileResponse> {
  const token = getAuthToken()
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    let message = `Erro ao interpretar ${errorLabel} (${response.status})`

    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return (await response.json()) as ParseStatementFileResponse
}

export async function parseStatementXlsx(
  slug: string,
  accountId: string,
  file: File
): Promise<ParseStatementXlsxResponse> {
  const url = new URL(
    `/organizations/${slug}/accounts/${accountId}/statements/parse-xlsx`,
    env.VITE_API_HOST
  )

  return (await uploadStatementFile(url, file, 'XLSX')) as ParseStatementXlsxResponse
}

export async function parseStatementOfx(
  slug: string,
  accountId: string,
  file: File
): Promise<ParseStatementOfxResponse> {
  const url = new URL(
    `/organizations/${slug}/accounts/${accountId}/statements/parse-ofx`,
    env.VITE_API_HOST
  )

  return (await uploadStatementFile(url, file, 'OFX')) as ParseStatementOfxResponse
}

export async function parseStatementOfxOrg(
  slug: string,
  file: File
): Promise<ParseStatementOfxResponse> {
  const url = new URL(`/organizations/${slug}/statements/parse-ofx`, env.VITE_API_HOST)

  return (await uploadStatementFile(url, file, 'OFX')) as ParseStatementOfxResponse
}
