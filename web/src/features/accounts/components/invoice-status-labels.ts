import type { ParseStatementFileResponse } from '@/lib/parse-statement'
import { formatCurrency } from '@/lib/currency'

export type InvoiceKind = 'partial' | 'closed_unpaid' | 'closed_paid'

export function resolveInvoiceKind(
  invoiceStatus: ParseStatementFileResponse['invoiceStatus']
): InvoiceKind {
  if (invoiceStatus.kind) return invoiceStatus.kind

  if (invoiceStatus.defaultIsPaid) return 'closed_paid'
  if (invoiceStatus.defaultIsClosed) return 'closed_unpaid'
  return 'partial'
}

type InvoiceStatusDisplay = {
  cycleLabel: string
  cycleClassName: string
  paymentLabel: string | null
  paymentClassName: string | null
  explanation: string
}

export function getInvoiceStatusDisplay(
  kind: InvoiceKind,
  invoiceStatus: Pick<
    ParseStatementFileResponse['invoiceStatus'],
    'importSource' | 'suggestedPaidReason'
  >,
  totalAmount?: string | null
): InvoiceStatusDisplay {
  if (kind === 'partial') {
    const explanation =
      invoiceStatus.importSource === 'ofx'
        ? 'OFX do ciclo atual — o fechamento ainda não ocorreu.'
        : 'Exportação do ciclo atual — o fechamento ainda não ocorreu.'

    return {
      cycleLabel: 'Ciclo atual',
      cycleClassName: 'border-sky-200 bg-sky-50 text-sky-800',
      paymentLabel: null,
      paymentClassName: null,
      explanation,
    }
  }

  if (kind === 'closed_paid') {
    const explanation =
      invoiceStatus.importSource === 'xlsx'
        ? 'Exportação XLSX — fatura paga do Itaú.'
        : invoiceStatus.importSource === 'ofx'
          ? 'Exportação OFX — fatura fechada com identificadores do banco.'
          : invoiceStatus.suggestedPaidReason

    return {
      cycleLabel: 'Fatura fechada',
      cycleClassName: 'border-slate-200 bg-slate-50 text-slate-700',
      paymentLabel: 'Quitada',
      paymentClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      explanation,
    }
  }

  const explanation =
    invoiceStatus.importSource === 'ofx'
      ? 'Exportação OFX — fatura fechada com identificadores do banco.'
      : totalAmount
        ? `Ciclo encerrado. Total a pagar: ${formatCurrency(Number(totalAmount))} — nenhum pagamento desta fatura foi encontrado no arquivo.`
        : 'Ciclo encerrado. Nenhum pagamento desta fatura foi encontrado no arquivo.'

  return {
    cycleLabel: 'Fatura fechada',
    cycleClassName: 'border-slate-200 bg-slate-50 text-slate-700',
    paymentLabel: 'Aguardando pagamento',
    paymentClassName: 'border-amber-200 bg-amber-50 text-amber-800',
    explanation,
  }
}
