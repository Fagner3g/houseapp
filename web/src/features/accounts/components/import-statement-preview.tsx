import dayjs from 'dayjs'
import { AlertTriangle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { ImportStatementBody } from '@/api/generated/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/currency'
import {
  formatImportedPurchasePeriodRange,
  formatInvoiceLabel,
  resolveStatementViewMonthKey,
} from '@/lib/billing-cycle'
import type { ParseStatementFileResponse } from '@/lib/parse-statement'

import {
  applyReviewToImportBody,
  buildInitialReviewRows,
  buildItemsFromParsedTransactions,
  type ImportReviewRowState,
} from './import-review-types'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'
import { getInvoiceStatusDisplay, resolveInvoiceKind } from './invoice-status-labels'
import { ImportStatementReviewTable } from './import-statement-review-table'

type ImportStatementPreviewProps = {
  accountId: string
  closingDay?: number
  dueDay?: number
  parsed: ImportStatementBody
  summary: ParseStatementFileResponse['summary']
  duplicate: ParseStatementFileResponse['duplicate']
  cardMismatchWarning?: string | null
  invoiceStatus: ParseStatementFileResponse['invoiceStatus']
  provider: string | null
  isPending: boolean
  onReset: () => void
  onViewExistingStatement?: (params: { accountId: string; monthKey: string }) => void
  onConfirm: (data: {
    parsedWithReview: ImportStatementBody
    rows: Record<string, ImportReviewRowState>
    items: ReturnType<typeof buildItemsFromParsedTransactions>
  }) => void
}

function money(value: string | null | undefined) {
  if (!value) return '—'
  return formatCurrency(Number(value))
}

function formatProviderLabel(provider: string | null): string | null {
  if (!provider) return null
  if (provider === 'ofx') return 'OFX Nubank'
  if (provider === 'xlsx') return 'XLSX Itaú'
  return provider
}

export function ImportStatementPreview({
  accountId,
  closingDay,
  dueDay,
  parsed,
  duplicate,
  cardMismatchWarning,
  invoiceStatus,
  provider,
  isPending,
  onReset,
  onViewExistingStatement,
  onConfirm,
}: ImportStatementPreviewProps) {
  const items = useMemo(() => buildItemsFromParsedTransactions(parsed.transactions), [parsed.transactions])
  const [rows, setRows] = useState<Record<string, ImportReviewRowState>>(() =>
    buildInitialReviewRows(items)
  )

  const invoiceKind = resolveInvoiceKind(invoiceStatus)
  const invoiceDisplay = getInvoiceStatusDisplay(invoiceKind, invoiceStatus, parsed.totalAmount)

  const initializedRows = useMemo(() => {
    const next = { ...rows }
    for (const item of items) {
      if (!next[item.id]) {
        Object.assign(next, buildInitialReviewRows([item]))
      }
    }
    return next
  }, [rows, items])

  const newItems = items.filter(item => !item.isDuplicate)
  const existingItems = items.filter(item => item.isDuplicate)
  const categorizedCount = newItems.filter(
    item => initializedRows[item.id]?.categoryId && !isCardStatementCreditTitle(item.title)
  ).length
  const splitCount = newItems.filter(item => initializedRows[item.id]?.splitMode !== 'none').length
  const approvedCount = newItems.filter(item => initializedRows[item.id]?.validated).length
  const allApproved =
    newItems.length === 0 || newItems.every(item => initializedRows[item.id]?.validated)
  const remainingCount = newItems.length - approvedCount
  const existingStatement = duplicate.existingStatement as {
    accountId?: string
    periodStart?: string | null
    periodEnd?: string | null
    dueDate?: string | null
    closingDate?: string | null
    importedAt?: string
    transactionsCount?: number
    totalAmount?: string | null
    fileName?: string | null
  } | null
  const existingViewMonthKey =
    existingStatement && closingDay != null && dueDay != null
      ? resolveStatementViewMonthKey(existingStatement, closingDay, dueDay)
      : existingStatement?.dueDate
        ? dayjs(existingStatement.dueDate).format('YYYY-MM')
        : null
  const existingAccountId = existingStatement?.accountId ?? accountId

  const handleConfirm = () => {
    if (!allApproved) {
      toast.error(`Aprove todos os lançamentos antes de importar (${approvedCount}/${newItems.length})`)
      return
    }

    onConfirm({
      parsedWithReview: applyReviewToImportBody(parsed, initializedRows, items, {
        isClosed: invoiceKind !== 'partial',
        isPaid: invoiceKind === 'closed_paid',
      }),
      rows: initializedRows,
      items,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      {cardMismatchWarning ? (
        <div className="flex shrink-0 gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>{cardMismatchWarning}</p>
        </div>
      ) : null}

      {duplicate.mode === 'blocked' && existingStatement ? (
        <div className="flex shrink-0 gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="space-y-2">
            <p className="font-medium">Esta fatura já foi importada</p>
            <p className="text-amber-900/80">
              {duplicate.matchType === 'file_hash'
                ? 'O arquivo é idêntico a uma importação anterior.'
                : 'Já existe uma fatura com o mesmo vencimento neste cartão.'}
            </p>
            <div className="space-y-1 text-xs text-amber-900/90">
              {existingStatement.fileName ? (
                <p>Arquivo: {existingStatement.fileName}</p>
              ) : null}
              {existingStatement.periodStart && existingStatement.periodEnd ? (
                <p>
                  Período:{' '}
                  {formatImportedPurchasePeriodRange(
                    existingStatement.periodStart,
                    existingStatement.periodEnd
                  )}
                </p>
              ) : null}
              {existingStatement.dueDate ? (
                <p>Vencimento: {dayjs(existingStatement.dueDate).format('DD/MM/YYYY')}</p>
              ) : null}
              {existingStatement.importedAt ? (
                <p>Importada em {dayjs(existingStatement.importedAt).format('DD/MM/YYYY HH:mm')}</p>
              ) : null}
              {existingStatement.transactionsCount != null ? (
                <p>{existingStatement.transactionsCount} lançamento(s) no sistema</p>
              ) : null}
            </div>
            {existingViewMonthKey && onViewExistingStatement ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-1 border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
                onClick={() =>
                  onViewExistingStatement({
                    accountId: existingAccountId,
                    monthKey: existingViewMonthKey,
                  })
                }
              >
                Ver {formatInvoiceLabel(existingViewMonthKey)}
              </Button>
            ) : existingViewMonthKey ? (
              <p className="text-xs text-amber-900/90">
                Abra {formatInvoiceLabel(existingViewMonthKey)} no cartão para ver os lançamentos.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {duplicate.mode === 'update' && duplicate.existingStatement ? (
        <div className="flex shrink-0 gap-3 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm text-sky-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-sky-600" />
          <div className="space-y-1">
            <p className="font-medium">Complemento do ciclo atual</p>
            <p className="text-sky-900/80">
              {duplicate.newTransactionsCount} lançamento(s) novo(s) e{' '}
              {duplicate.duplicateTransactionsCount} já importado(s) serão adicionados à fatura
              parcial deste vencimento.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{parsed.fileName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Fech. {dayjs(parsed.closingDate).format('DD/MM/YYYY')}</span>
            <span>·</span>
            <span>Venc. {dayjs(parsed.dueDate).format('DD/MM/YYYY')}</span>
            <span>·</span>
            <span>
              Compras {dayjs(parsed.periodStart).format('DD/MM')} –{' '}
              {dayjs(parsed.periodEnd).format('DD/MM/YYYY')}
            </span>
            {provider ? (
              <>
                <span>·</span>
                <span>{formatProviderLabel(provider)}</span>
              </>
            ) : null}
            <Badge variant="outline" className={invoiceDisplay.cycleClassName}>
              {invoiceDisplay.cycleLabel}
            </Badge>
            {invoiceDisplay.paymentLabel ? (
              <Badge variant="outline" className={invoiceDisplay.paymentClassName ?? undefined}>
                {invoiceDisplay.paymentLabel}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{invoiceDisplay.explanation}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Total</p>
          <p className="text-xl font-semibold tabular-nums text-slate-900">
            {money(parsed.totalAmount)}
          </p>
        </div>
      </div>

      <p className="shrink-0 px-1 text-sm text-slate-600">
        {existingItems.length > 0 ? (
          <>
            {existingItems.length} lançamento(s) já estão no sistema e {newItems.length} precisam
            de revisão antes de importar. Ajuste categorias e delegações nos novos, depois aprove
            cada item (ou use &quot;Aprovar todos os novos&quot;).
          </>
        ) : (
          <>
            Confira os lançamentos, ajuste categorias e delegue compras de outros membros. Aprove
            cada item (ou use &quot;Aprovar todos&quot;) antes de importar.
          </>
        )}
      </p>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ImportStatementReviewTable items={items} rows={rows} onRowsChange={setRows} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white pt-3">
        <div className="flex items-center gap-3">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{
                width: `${newItems.length ? (approvedCount / newItems.length) * 100 : 100}%`,
              }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-slate-500">
            {approvedCount}/{newItems.length} aprovados
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {items.length} lançamento(s) no arquivo
          {existingItems.length > 0 ? ` · ${existingItems.length} já no sistema` : ''}
          {newItems.length > 0 ? ` · ${newItems.length} novo(s)` : ''}
          {newItems.length > 0 ? ` · ${categorizedCount} categorizados · ${splitCount} com delegação` : ''}
        </p>
        <div className="flex items-center justify-end gap-2">
          {!allApproved ? (
            <p className="mr-auto text-xs text-amber-700">
              Aprove os lançamentos restantes ({remainingCount}) para importar
            </p>
          ) : null}
          <Button variant="outline" onClick={onReset}>
            Trocar arquivo
          </Button>
          <Button
            className="bg-slate-900"
            disabled={isPending || duplicate.mode === 'blocked' || !allApproved}
            onClick={handleConfirm}
          >
            {duplicate.mode === 'blocked'
              ? 'Fatura já importada'
              : isPending
                ? 'Importando...'
                : duplicate.mode === 'update'
                  ? duplicate.newTransactionsCount > 0
                    ? allApproved
                      ? `Importar ${duplicate.newTransactionsCount} novos`
                      : `Aprovar ${remainingCount} restantes`
                    : 'Atualizar fatura'
                  : allApproved
                    ? `Importar ${newItems.length || parsed.transactions.length} lançamentos`
                    : `Aprovar ${remainingCount} restantes`}
          </Button>
        </div>
      </div>
    </div>
  )
}
