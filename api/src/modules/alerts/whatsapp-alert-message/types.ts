export const WHATSAPP_CREDIT_CARD_LABEL = 'Cartão de crédito'
export const WHATSAPP_BATCH_SEPARATOR = '───────────────'
export const WHATSAPP_TIMEZONE = 'America/Sao_Paulo'

export type WhatsAppAlertMessageInput = {
  recipientName: string
  transactionTitle: string
  accountName?: string | null
  daysUntilDue: number
  dueDate: Date | string
  amount: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  splitParticipantCount?: number | null
  collectLumpSum?: boolean | null
  kind?: string
  overdueDays?: number | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
  isCreditCardInvoice?: boolean
  note?: string | null
}

export type WhatsAppAlertBatchItem = {
  transactionTitle: string
  summaryLine?: string | null
  dueLine: string
  accountName?: string | null
  isCreditCardInvoice?: boolean
  amount?: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  splitParticipantCount?: number | null
  collectLumpSum?: boolean | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
  note?: string | null
  daysUntilDue: number
  kind?: string
}

export type WhatsAppBatchRenderUnit =
  | {
      type: 'credit_card_group'
      accountName: string
      dueLine: string
      items: WhatsAppAlertBatchItem[]
    }
  | { type: 'single'; item: WhatsAppAlertBatchItem }
