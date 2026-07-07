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
  importSource: 'pdf' | 'csv' | 'ofx'
  defaultIsClosed: boolean
  defaultIsPaid: boolean
}

export type ParseStatementPdfResponse = {
  parsed: ImportStatementBody
  provider: 'groq' | 'gemini' | 'deepseek' | 'regex' | 'csv' | 'ofx'
  transactionsCount: number
  extractedTextLength: number
  categorizedCount: number
  splitsInferredCount: number
  summary: StatementImportSummary
  duplicate: StatementDuplicateCheck
  invoiceStatus: StatementInvoiceStatus
}

export type SuggestedCreditCardAccount = {
  name: string
  institution: string
  currency: string
  closingDay: number
  dueDay: number | null
  creditLimit?: string | null
}

export type OfxAccountResolution =
  | {
      mode: 'existing'
      accountId: string
      accountName: string
      autoProvisioned?: boolean
      autoReactivated?: boolean
    }
  | {
      mode: 'missing'
      ofxAccountId: string
      suggestedAccount: SuggestedCreditCardAccount
      uploadedOnAccountName?: string
    }
  | {
      mode: 'mismatch'
      ofxAccountId: string
      expectedAccountId: string
      expectedAccountName: string
      uploadedOnAccountId: string
      uploadedOnAccountName: string
    }

export type ParseStatementOfxResponse = ParseStatementPdfResponse & {
  accountResolution: OfxAccountResolution
}

export type ParseStatementFileResponse = ParseStatementPdfResponse | ParseStatementOfxResponse

export function isParseStatementOfxResponse(
  value: ParseStatementFileResponse
): value is ParseStatementOfxResponse {
  return 'accountResolution' in value
}

export async function parseStatementPdf(
  slug: string,
  accountId: string,
  file: File
): Promise<ParseStatementPdfResponse> {
  const token = getAuthToken()
  const url = new URL(
    `/organizations/${slug}/accounts/${accountId}/statements/parse-pdf`,
    env.VITE_API_HOST
  )

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    let message = `Erro ao interpretar PDF (${response.status})`

    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return (await response.json()) as ParseStatementPdfResponse
}

export async function parseStatementCsv(
  slug: string,
  accountId: string,
  file: File
): Promise<ParseStatementFileResponse> {
  const token = getAuthToken()
  const url = new URL(
    `/organizations/${slug}/accounts/${accountId}/statements/parse-csv`,
    env.VITE_API_HOST
  )

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    let message = `Erro ao interpretar CSV (${response.status})`

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

export async function parseStatementOfx(
  slug: string,
  accountId: string,
  file: File
): Promise<ParseStatementOfxResponse> {
  const token = getAuthToken()
  const url = new URL(
    `/organizations/${slug}/accounts/${accountId}/statements/parse-ofx`,
    env.VITE_API_HOST
  )

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    let message = `Erro ao interpretar OFX (${response.status})`

    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return (await response.json()) as ParseStatementOfxResponse
}

export async function parseStatementOfxOrg(
  slug: string,
  file: File
): Promise<ParseStatementOfxResponse> {
  const token = getAuthToken()
  const url = new URL(`/organizations/${slug}/statements/parse-ofx`, env.VITE_API_HOST)

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (!response.ok) {
    let message = `Erro ao interpretar OFX (${response.status})`

    try {
      const body = (await response.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  return (await response.json()) as ParseStatementOfxResponse
}
