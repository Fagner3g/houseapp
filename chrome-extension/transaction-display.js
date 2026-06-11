/**
 * Mirrors web calendar transbordo logic (transaction-events.ts).
 * Loaded before popup.js; exposes window.TransactionDisplay.
 *
 * Parity test cases (manual QA alongside web vitest):
 * - 10/mai pending, viewing jun → displayKey 2026-06-10, isTransbordo true
 * - 10/mai partial, viewing jun → displayKey 2026-06-10, isTransbordo true
 * - 10/mai paid 11/jun, viewing jun → displayKey 2026-06-11, isTransbordo false
 * - série with 15/jun open installment must NOT move 10/mai item to 15/jun
 */
;(function (global) {
  function toDateKey(value) {
    const d = value instanceof Date ? value : new Date(value)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function isInRange(dateKey, from, to) {
    return dateKey >= from && dateKey <= to
  }

  /** Original due date is in a month before the calendar view month. */
  function isDueDateBeforeViewMonth(dueDate, dateFrom) {
    return toDateKey(dueDate).slice(0, 7) < dateFrom.slice(0, 7)
  }

  function isOpenTransaction(status) {
    return status === 'pending' || status === 'partial'
  }

  function getMonthDateKeyRange(year, month) {
    const m = String(month).padStart(2, '0')
    const lastDay = new Date(year, month, 0).getDate()
    return {
      from: `${year}-${m}-01`,
      to: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  function addMonthsToDateKey(dateKey, months) {
    const [y, mo, d] = dateKey.split('-').map(Number)
    const cursor = new Date(y, mo - 1 + months, d)
    return toDateKey(cursor)
  }

  function rollDueDateIntoViewMonth(dueKey, dateFrom, dateTo) {
    if (dueKey > dateTo) return null

    let cursorKey = dueKey
    while (cursorKey < dateFrom) {
      cursorKey = addMonthsToDateKey(cursorKey, 1)
    }

    return isInRange(cursorKey, dateFrom, dateTo) ? cursorKey : null
  }

  function getOpenTransactionDisplayDate(transaction, _allTransactions, dateFrom, dateTo) {
    const dueKey = toDateKey(transaction.dueDate)

    if (isInRange(dueKey, dateFrom, dateTo)) {
      return { displayKey: dueKey, isTransbordoRepositioned: false }
    }

    if (dueKey < dateFrom) {
      const rolledKey = rollDueDateIntoViewMonth(dueKey, dateFrom, dateTo)
      if (rolledKey) {
        return { displayKey: rolledKey, isTransbordoRepositioned: true }
      }
    }

    return { displayKey: dueKey, isTransbordoRepositioned: false }
  }

  function getTransactionEventSpan(transaction, dateFrom, dateTo, allTransactions) {
    const dueKey = toDateKey(transaction.dueDate)

    // Transbordo paid in the viewing month: show on payment date (partial or paid).
    if (!isInRange(dueKey, dateFrom, dateTo) && transaction.paidAt) {
      const paidKey = toDateKey(transaction.paidAt)
      if (isInRange(paidKey, dateFrom, dateTo)) {
        return { displayKey: paidKey, isTransbordoRepositioned: false, isPaidAtRepositioned: true }
      }
    }

    if (isOpenTransaction(transaction.status)) {
      const { displayKey, isTransbordoRepositioned } = getOpenTransactionDisplayDate(
        transaction,
        allTransactions,
        dateFrom,
        dateTo
      )
      if (!isInRange(displayKey, dateFrom, dateTo)) return null

      return { displayKey, isTransbordoRepositioned, isPaidAtRepositioned: false }
    }

    if (isInRange(dueKey, dateFrom, dateTo)) {
      return { displayKey: dueKey, isTransbordoRepositioned: false, isPaidAtRepositioned: false }
    }

    return null
  }

  function computeDaysUntilDue(dueDate, referenceDate) {
    const ref = new Date(referenceDate)
    ref.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    return Math.round((due - ref) / (1000 * 60 * 60 * 24))
  }

  function resolveOverdueDays(transaction, referenceDate) {
    if (transaction.status === 'paid') {
      if (!transaction.paidAt) return undefined
      const daysUntilDue = computeDaysUntilDue(transaction.dueDate, transaction.paidAt)
      return daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined
    }

    if (!isOpenTransaction(transaction.status)) return undefined

    if (transaction.overdueDays > 0) {
      return transaction.overdueDays
    }

    const daysUntilDue = computeDaysUntilDue(transaction.dueDate, referenceDate)
    return daysUntilDue < 0 ? Math.abs(daysUntilDue) : undefined
  }

  function fmtCompactCurrency(amount) {
    const num = typeof amount === 'number' ? amount : parseFloat(amount)
    const formatted = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return formatted.replace(/\u00a0/g, ' ').replace(/\s/g, '').replace(',00', '')
  }

  function formatPartialPaymentStatusCompact(totalReais, valuePaidCents) {
    const paidReais = valuePaidCents / 100
    const remainingReais = Math.max(0, totalReais - paidReais)
    return `pago ${fmtCompactCurrency(paidReais)} · falta ${fmtCompactCurrency(remainingReais)}`
  }

  function formatPartialPaymentDescription(totalReais, valuePaidCents) {
    const paidReais = valuePaidCents / 100
    const remainingReais = Math.max(0, totalReais - paidReais)
    const br = n =>
      n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    return `Pagamento parcial: pago ${br(paidReais)} de ${br(totalReais)} · falta ${br(remainingReais)}`
  }

  function fmtShortDate(isoString) {
    const d = new Date(isoString)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  function getValuePaidCents(transaction) {
    if (transaction.valuePaidCents != null) return transaction.valuePaidCents
    if (transaction.valuePaid == null) return null
    const totalReais = transaction.originalAmount ?? transaction.amount
    return transaction.valuePaid > totalReais
      ? Math.round(transaction.valuePaid)
      : Math.round(transaction.valuePaid * 100)
  }

  function buildTransactionEventDescription(transaction, isTransbordoRepositioned) {
    const parts = []

    if (isTransbordoRepositioned) {
      parts.push(`Transbordo · venc. ${fmtShortDate(transaction.dueDate)}`)
    }

    const totalReais = transaction.originalAmount ?? transaction.amount
    const valuePaidCents = getValuePaidCents(transaction)
    if (transaction.status === 'partial' && valuePaidCents != null) {
      parts.push(formatPartialPaymentDescription(totalReais, valuePaidCents))
    }

    if (transaction.installmentsTotal != null && transaction.installmentIndex != null) {
      parts.push(`Parcela ${transaction.installmentIndex} de ${transaction.installmentsTotal}`)
    }

    return parts.length > 0 ? parts.join(' · ') : undefined
  }

  function buildTransactionStatusLine(transaction, referenceDate, isTransbordo, isPaidAtRepositioned) {
    const overdueDays = resolveOverdueDays(transaction, referenceDate)

    if (isPaidAtRepositioned) {
      if (transaction.status === 'paid') {
        const paidOverdueDays = resolveOverdueDays(transaction, referenceDate)
        if (paidOverdueDays != null && paidOverdueDays > 0) {
          return `Pago · ${paidOverdueDays}d venc.`
        }
        return 'Pago'
      }

      if (transaction.status === 'partial') {
        const parts = ['Parcial']
        const totalReais = transaction.originalAmount ?? transaction.amount
        const valuePaidCents = getValuePaidCents(transaction)
        if (valuePaidCents != null) {
          parts.push(formatPartialPaymentStatusCompact(totalReais, valuePaidCents))
        }
        return parts.join(' · ')
      }
    }

    if (transaction.status === 'paid') return 'Pago'

    if (transaction.status === 'pending' && overdueDays != null && overdueDays > 0) {
      if (isTransbordo) {
        return overdueDays > 0
          ? `${overdueDays}d · Vencido · Transbordo`
          : 'Vencido · Transbordo'
      }
      return overdueDays > 0 ? `${overdueDays}d · Vencido` : 'Vencido'
    }

    if (transaction.status === 'partial') {
      const parts = []
      const isOverdue = overdueDays != null && overdueDays > 0

      if (isOverdue) {
        parts.push(`${overdueDays}d`)
        parts.push(isTransbordo ? 'Vencida · Transbordo' : 'Vencida')
      } else {
        parts.push('Parcial')
      }

      const totalReais = transaction.originalAmount ?? transaction.amount
      const valuePaidCents = getValuePaidCents(transaction)
      if (valuePaidCents != null) {
        parts.push(formatPartialPaymentStatusCompact(totalReais, valuePaidCents))
      }
      return parts.join(' · ')
    }

    const daysUntilDue = computeDaysUntilDue(transaction.dueDate, referenceDate)
    if (daysUntilDue === 0) return 'Vence hoje'
    if (daysUntilDue === 1) return 'Amanhã'
    if (daysUntilDue > 1) return `${daysUntilDue}d`

    return 'Pendente'
  }

  /** Normalize reports API shapes into a consistent transaction object. */
  function normalizeTransaction(tx) {
    if (!tx) return null

    const serieId = tx.serieId ?? tx.seriesId ?? null
    const originalAmount = tx.originalAmount ?? tx.amount
    let valuePaidCents = null

    if (tx.status === 'partial' && tx.valuePaid != null) {
      // Reports API returns valuePaid in reais; in-memory updates use cents.
      valuePaidCents =
        tx.valuePaid > originalAmount ? Math.round(tx.valuePaid) : Math.round(tx.valuePaid * 100)
    } else if (tx.status === 'partial' && tx.valuePaidCents != null) {
      valuePaidCents = tx.valuePaidCents
    }

    return {
      ...tx,
      serieId,
      originalAmount,
      valuePaidCents,
      valuePaid: valuePaidCents,
    }
  }

  /** Merge all report transaction pools (dedupe by id). */
  function mergeReportTransactions(reports) {
    const byId = new Map()

    function add(tx) {
      const normalized = normalizeTransaction(tx)
      if (!normalized?.id) return
      const existing = byId.get(normalized.id)
      byId.set(normalized.id, existing ? { ...existing, ...normalized } : normalized)
    }

    for (const tx of reports?.allTransactions || []) add(tx)
    for (const tx of reports?.overdueTransactions?.transactions || []) add(tx)
    for (const tx of reports?.upcomingAlerts?.transactions || []) add(tx)
    for (const tx of reports?.paidThisMonth?.transactions || []) add(tx)

    return Array.from(byId.values())
  }

  /**
   * Display metadata for a single transaction in a given month view.
   * Used by VENCIDAS, PRÓXIMAS and Todas do mês.
   */
  function getTransactionDisplayMetadata(tx, allTransactions, year, month, referenceDate) {
    const { from, to } = getMonthDateKeyRange(year, month)
    const ref = referenceDate || new Date()
    const span = getTransactionEventSpan(tx, from, to, allTransactions)

    if (!span) {
      const overdueDays = resolveOverdueDays(tx, ref)
      return {
        displayKey: toDateKey(tx.dueDate),
        isTransbordoRepositioned: false,
        isTransbordo: false,
        description: undefined,
        statusLine: buildTransactionStatusLine(tx, ref, false, false),
        overdueDays,
      }
    }

    const isPaidAtRepositioned = span.isPaidAtRepositioned
    const overdueDays = resolveOverdueDays(tx, ref)
    const isTransbordo =
      !isPaidAtRepositioned &&
      isOpenTransaction(tx.status) &&
      isDueDateBeforeViewMonth(tx.dueDate, from)
    const showTransbordoDescription =
      span.isTransbordoRepositioned ||
      (isPaidAtRepositioned && isDueDateBeforeViewMonth(tx.dueDate, from))

    return {
      displayKey: span.displayKey,
      isTransbordoRepositioned: span.isTransbordoRepositioned,
      isPaidAtRepositioned: span.isPaidAtRepositioned,
      isTransbordo,
      description: buildTransactionEventDescription(tx, showTransbordoDescription),
      statusLine: buildTransactionStatusLine(tx, ref, isTransbordo, isPaidAtRepositioned),
      overdueDays,
    }
  }

  /**
   * Build month view items with transbordo repositioning (mirrors transactionsToCalendarEvents).
   */
  function getMonthTransactionsForDisplay(transactions, year, month, referenceDate) {
    const { from, to } = getMonthDateKeyRange(year, month)
    const items = []

    for (const tx of transactions) {
      const span = getTransactionEventSpan(tx, from, to, transactions)
      if (!span) continue

      items.push({
        transaction: tx,
        ...getTransactionDisplayMetadata(tx, transactions, year, month, referenceDate),
      })
    }

    return items.sort((a, b) => a.displayKey.localeCompare(b.displayKey))
  }

  global.TransactionDisplay = {
    mergeReportTransactions,
    getMonthTransactionsForDisplay,
    getTransactionDisplayMetadata,
    getMonthDateKeyRange,
    toDateKey,
  }
})(typeof window !== 'undefined' ? window : self)
