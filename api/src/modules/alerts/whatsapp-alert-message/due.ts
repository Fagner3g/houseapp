import { formatDueDate } from './format'

export function buildDueLine(input: {
  daysUntilDue: number
  dueDate: Date | string
  kind?: string
  overdueDays?: number | null
  isCreditCardInvoice?: boolean
}): string {
  const formattedDate = formatDueDate(input.dueDate)
  const isOverdue = input.kind === 'overdue' || input.daysUntilDue < 0
  if (input.isCreditCardInvoice) {
    if (isOverdue) {
      const overdueDays = input.overdueDays ?? Math.abs(input.daysUntilDue)
      if (overdueDays === 1) return `Fatura vencida há 1 dia · ${formattedDate}`
      return `Fatura vencida há ${overdueDays} dias · ${formattedDate}`
    }

    if (input.daysUntilDue === 0) return `Fatura vence hoje · ${formattedDate}`
    if (input.daysUntilDue === 1) return `Fatura vence amanhã · ${formattedDate}`
    return `Fatura vence em ${input.daysUntilDue} dias · ${formattedDate}`
  }

  if (isOverdue) {
    const overdueDays = input.overdueDays ?? Math.abs(input.daysUntilDue)
    if (overdueDays === 1) return `Vencida há 1 dia · ${formattedDate}`
    return `Vencida há ${overdueDays} dias · ${formattedDate}`
  }

  if (input.daysUntilDue === 0) return `Vence hoje · ${formattedDate}`
  if (input.daysUntilDue === 1) return `Vence amanhã · ${formattedDate}`
  return `Vence em ${input.daysUntilDue} dias · ${formattedDate}`
}
