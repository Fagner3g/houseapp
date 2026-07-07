import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)

const TIMEZONE = 'America/Sao_Paulo'

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
  kind?: string
  overdueDays?: number | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
  isCreditCardInvoice?: boolean
  note?: string | null
}

export function buildGreeting(recipientName: string, referenceDate = new Date()): string {
  const hour = dayjs(referenceDate).tz(TIMEZONE).hour()
  const firstName = recipientName.trim().split(/\s+/)[0] || recipientName

  if (hour < 12) return `Bom dia, ${firstName}!`
  if (hour < 18) return `Boa tarde, ${firstName}!`
  return `Boa noite, ${firstName}!`
}

export function formatDueDate(dueDate: Date | string): string {
  return dayjs(dueDate).tz(TIMEZONE).format('DD/MM/YYYY')
}

export function formatAmountBRL(amount: string | null | undefined): string | null {
  if (!amount) return null

  const [integerPart, fractionalPart = '00'] = amount.split('.')
  const cents = fractionalPart.padEnd(2, '0').slice(0, 2)

  return `R$ ${integerPart},${cents}`
}

export function cleanTransactionTitle(title: string): string {
  return title
    .replace(/\s*[-–—]\s*parcela\s+\d+\s*\/\s*\d+/gi, '')
    .replace(/\s+parcela\s+\d+\s*\/\s*\d+/gi, '')
    .replace(/^(?:vence hoje|vence amanhã|vence em \d+ dias|vencido há \d+ dias?|pague hoje|pague amanhã|pague em \d+ dias|você deve hoje|você deve amanhã|você deve em \d+ dias):\s*/i, '')
    .trim()
}

export function formatInstallmentLine(
  installmentNumber?: number | null,
  installmentsTotal?: number | null
): string | null {
  if (!installmentNumber || !installmentsTotal || installmentsTotal < 2) return null
  return `Parcela ${installmentNumber} de ${installmentsTotal}`
}

export function buildDetailLine(input: { accountName?: string | null }): string | null {
  const accountName = input.accountName?.trim()
  return accountName ? accountName : null
}

export function buildInstallmentSummaryLine(input: {
  installmentNumber: number
  installmentsTotal: number
  installmentAmount?: string | null
  totalAmount?: string | null
}): string | null {
  const amount = formatAmountBRL(
    input.installmentAmount ??
      (input.totalAmount
        ? divideMoneyString(input.totalAmount, input.installmentsTotal)
        : null)
  )
  if (!amount) return null
  return `${input.installmentNumber}/${input.installmentsTotal}: ${amount}`
}

/** @deprecated Use buildInstallmentSummaryLine */
export function buildSplitInstallmentSummaryLine(input: {
  installmentNumber: number
  installmentsTotal: number
  splitShareInstallmentAmount?: string | null
  splitAmount?: string | null
}): string | null {
  return buildInstallmentSummaryLine({
    installmentNumber: input.installmentNumber,
    installmentsTotal: input.installmentsTotal,
    installmentAmount: input.splitShareInstallmentAmount,
    totalAmount: input.splitAmount,
  })
}

export function buildSummaryLine(input: {
  amount?: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
}): string | null {
  const splitTotal = formatAmountBRL(input.splitAmount)
  const splitRemaining = formatAmountBRL(input.splitRemainingAmount)
  const dueAmount = formatAmountBRL(input.amount)
  const hasInstallments = !!(
    input.installmentNumber &&
    input.installmentsTotal &&
    input.installmentsTotal >= 2
  )
  const isSplit = !!input.isSplit
  const hasPartialPayment = isSplit && moneyStringToCentavos(input.splitPaidAmount) > 0n

  if (hasInstallments && input.installmentsTotal && input.installmentNumber) {
    if (isSplit) {
      return buildInstallmentSummaryLine({
        installmentNumber: input.installmentNumber,
        installmentsTotal: input.installmentsTotal,
        installmentAmount: input.splitShareInstallmentAmount,
        totalAmount: input.splitAmount,
      })
    }

    return buildInstallmentSummaryLine({
      installmentNumber: input.installmentNumber,
      installmentsTotal: input.installmentsTotal,
      installmentAmount: input.installmentAmount ?? input.amount,
      totalAmount: input.transactionTotalAmount,
    })
  }

  if (isSplit) {
    if (hasPartialPayment && splitRemaining && splitTotal) {
      return `Falta ${splitRemaining} de ${splitTotal}`
    }

    return splitTotal ? `Sua parte: ${splitTotal}` : dueAmount
  }

  return dueAmount
}

/** @deprecated Use buildSummaryLine — kept for backwards compatibility in tests */
export function buildValueLines(input: {
  amount?: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  installmentNumber?: number | null
  installmentsTotal?: number | null
  isSplit?: boolean
}): string[] {
  const summary = buildSummaryLine(input)
  return summary ? [summary] : []
}

function moneyStringToCentavos(value: string | null | undefined): bigint {
  if (!value) return 0n
  const [integerPart, fractionalPart = '00'] = value.split('.')
  const cents = (fractionalPart + '00').slice(0, 2)
  return BigInt(integerPart) * 100n + BigInt(cents)
}

function divideMoneyString(value: string, divisor: number): string | null {
  if (divisor < 1) return null
  const totalCentavos = moneyStringToCentavos(value)
  const shareCentavos = totalCentavos / BigInt(divisor)
  const integerPart = shareCentavos / 100n
  const fractionalPart = (shareCentavos % 100n).toString().padStart(2, '0')
  return `${integerPart}.${fractionalPart}`
}

export function buildDueLine(input: {
  daysUntilDue: number
  dueDate: Date | string
  kind?: string
  overdueDays?: number | null
  isCreditCardInvoice?: boolean
}): string {
  const formattedDate = formatDueDate(input.dueDate)
  const isOverdue = input.kind === 'overdue' || input.daysUntilDue < 0
  const invoicePrefix = input.isCreditCardInvoice ? 'Fatura ' : ''

  if (isOverdue) {
    const overdueDays = input.overdueDays ?? Math.abs(input.daysUntilDue)
    if (overdueDays === 1) return `${invoicePrefix}Vencida há 1 dia · ${formattedDate}`
    return `${invoicePrefix}Vencida há ${overdueDays} dias · ${formattedDate}`
  }

  if (input.daysUntilDue === 0) return `${invoicePrefix}Vence hoje · ${formattedDate}`
  if (input.daysUntilDue === 1) return `${invoicePrefix}Vence amanhã · ${formattedDate}`
  return `${invoicePrefix}Vence em ${input.daysUntilDue} dias · ${formattedDate}`
}

export function buildWhatsAppAlertMessage(
  input: WhatsAppAlertMessageInput,
  referenceDate = new Date()
): string {
  return buildWhatsAppBatchAlertMessage(
    {
      recipientName: input.recipientName,
      items: [
        toWhatsAppBatchItem({
          transactionTitle: input.transactionTitle,
          amount: input.amount,
          transactionTotalAmount: input.transactionTotalAmount,
          installmentAmount: input.installmentAmount,
          splitAmount: input.splitAmount,
          splitShareInstallmentAmount: input.splitShareInstallmentAmount,
          splitPaidAmount: input.splitPaidAmount,
          splitRemainingAmount: input.splitRemainingAmount,
          note: input.note,
          daysUntilDue: input.daysUntilDue,
          dueDate: input.dueDate,
          kind: input.kind,
          overdueDays: input.overdueDays,
          isCreditCardInvoice: input.isCreditCardInvoice,
          installmentNumber: input.installmentNumber,
          installmentsTotal: input.installmentsTotal,
          accountName: input.accountName,
          isSplit: input.isSplit,
        }),
      ],
    },
    referenceDate
  )
}

export type WhatsAppAlertBatchItem = {
  transactionTitle: string
  detailLine?: string | null
  summaryLine?: string | null
  /** @deprecated Prefer summaryLine */
  valueLines?: string[]
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

export function creditCardGroupKey(item: WhatsAppAlertBatchItem): string | null {
  const accountName = item.accountName?.trim()
  if (!item.isCreditCardInvoice || !accountName) return null
  return `${accountName}::${item.dueLine}`
}

export function buildWhatsAppBatchRenderUnits(
  items: WhatsAppAlertBatchItem[]
): WhatsAppBatchRenderUnit[] {
  const groups = new Map<string, WhatsAppAlertBatchItem[]>()
  const itemKeys = items.map(item => creditCardGroupKey(item))

  items.forEach((item, index) => {
    const key = itemKeys[index]
    if (!key) return
    const group = groups.get(key)
    if (group) {
      group.push(item)
      return
    }
    groups.set(key, [item])
  })

  const usedGroups = new Set<string>()
  const units: WhatsAppBatchRenderUnit[] = []

  items.forEach((item, index) => {
    const key = itemKeys[index]
    if (!key) {
      units.push({ type: 'single', item })
      return
    }
    if (usedGroups.has(key)) return
    usedGroups.add(key)
    units.push({
      type: 'credit_card_group',
      accountName: item.accountName!.trim(),
      dueLine: item.dueLine,
      items: groups.get(key) ?? [item],
    })
  })

  return units
}

function resolveItemSummaryLine(item: WhatsAppAlertBatchItem): string | null {
  return (
    item.summaryLine ??
    item.valueLines?.[0] ??
    buildSummaryLine({
      amount: item.amount,
      transactionTotalAmount: item.transactionTotalAmount,
      installmentAmount: item.installmentAmount,
      splitAmount: item.splitAmount,
      splitShareInstallmentAmount: item.splitShareInstallmentAmount,
      splitPaidAmount: item.splitPaidAmount,
      splitRemainingAmount: item.splitRemainingAmount,
      installmentNumber: item.installmentNumber,
      installmentsTotal: item.installmentsTotal,
      isSplit: item.isSplit,
    })
  )
}

function renderWhatsAppBatchItemLines(
  item: WhatsAppAlertBatchItem,
  options?: { includeNote?: boolean }
): string[] {
  const lines = [`${pickWhatsAppItemEmoji(item)} ${cleanTransactionTitle(item.transactionTitle)}`]
  const summaryLine = resolveItemSummaryLine(item)
  if (summaryLine) lines.push(summaryLine)
  if (options?.includeNote !== false && item.note) lines.push(`📝 ${item.note}`)
  return lines
}

function renderWhatsAppBatchUnitLines(unit: WhatsAppBatchRenderUnit): string[] {
  if (unit.type === 'single') {
    const lines = renderWhatsAppBatchItemLines(unit.item, { includeNote: false })
    lines.push(unit.item.dueLine)
    if (unit.item.note) lines.push(`📝 ${unit.item.note}`)
    return lines
  }

  const lines = [`💳 ${unit.accountName}`, unit.dueLine, '']
  unit.items.forEach((item, index) => {
    if (index > 0) lines.push('')
    lines.push(...renderWhatsAppBatchItemLines(item))
  })
  return lines
}

export const WHATSAPP_BATCH_SEPARATOR = '───────────────'

export function pickWhatsAppItemEmoji(item: { daysUntilDue: number; kind?: string }): string {
  if (item.kind === 'overdue' || item.kind?.includes('overdue') || item.daysUntilDue < 0) {
    return '⚠️'
  }
  if (item.daysUntilDue === 0) return '📅'
  return '🧾'
}

export function toWhatsAppBatchItem(input: {
  transactionTitle: string
  detailLine?: string | null
  valueLines?: string[]
  dueLine?: string
  amount?: string | null
  transactionTotalAmount?: string | null
  installmentAmount?: string | null
  splitAmount?: string | null
  splitShareInstallmentAmount?: string | null
  splitPaidAmount?: string | null
  splitRemainingAmount?: string | null
  note?: string | null
  daysUntilDue: number
  dueDate: Date | string
  kind?: string
  overdueDays?: number | null
  isCreditCardInvoice?: boolean
  installmentNumber?: number | null
  installmentsTotal?: number | null
  accountName?: string | null
  isSplit?: boolean
}): WhatsAppAlertBatchItem {
  const summaryLine =
    input.valueLines?.[0] ??
    buildSummaryLine({
      amount: input.amount,
      transactionTotalAmount: input.transactionTotalAmount,
      installmentAmount: input.installmentAmount,
      splitAmount: input.splitAmount,
      splitShareInstallmentAmount: input.splitShareInstallmentAmount,
      splitPaidAmount: input.splitPaidAmount,
      splitRemainingAmount: input.splitRemainingAmount,
      installmentNumber: input.installmentNumber,
      installmentsTotal: input.installmentsTotal,
      isSplit: input.isSplit,
    })

  return {
    transactionTitle: input.transactionTitle,
    summaryLine,
    dueLine:
      input.dueLine ??
      buildDueLine({
        daysUntilDue: input.daysUntilDue,
        dueDate: input.dueDate,
        kind: input.kind,
        overdueDays: input.overdueDays,
        isCreditCardInvoice: input.isCreditCardInvoice,
      }),
    accountName: input.accountName,
    isCreditCardInvoice: input.isCreditCardInvoice,
    amount: input.amount,
    transactionTotalAmount: input.transactionTotalAmount,
    installmentAmount: input.installmentAmount,
    splitAmount: input.splitAmount,
    splitShareInstallmentAmount: input.splitShareInstallmentAmount,
    splitPaidAmount: input.splitPaidAmount,
    splitRemainingAmount: input.splitRemainingAmount,
    installmentNumber: input.installmentNumber,
    installmentsTotal: input.installmentsTotal,
    isSplit: input.isSplit,
    note: input.note,
    daysUntilDue: input.daysUntilDue,
    kind: input.kind,
  }
}

export function buildWhatsAppBatchAlertMessage(
  input: {
    recipientName: string
    items: WhatsAppAlertBatchItem[]
  },
  referenceDate = new Date()
): string {
  const lines = [buildGreeting(input.recipientName, referenceDate), '']
  const units = buildWhatsAppBatchRenderUnits(input.items)

  units.forEach((unit, index) => {
    if (index > 0) {
      lines.push('')
      lines.push(WHATSAPP_BATCH_SEPARATOR)
      lines.push('')
    }

    lines.push(...renderWhatsAppBatchUnitLines(unit))
  })

  return lines.join('\n')
}
