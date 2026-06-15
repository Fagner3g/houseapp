// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmt(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount)
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function fmtDate(isoString) {
  const d = new Date(isoString)
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function show(id) { document.getElementById(id).classList.remove('hidden') }
function hide(id) { document.getElementById(id).classList.add('hidden') }

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function showScreen(name) {
  for (const s of ['login','loading','error','main']) {
    document.getElementById(`screen-${s}`).classList.toggle('hidden', s !== name)
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

/**
 * Returns 'past' | 'current' | 'future' relative to today.
 */
function getViewingContext(year, month) {
  const now = new Date()
  const cy = now.getFullYear()
  const cm = now.getMonth() + 1
  if (year < cy || (year === cy && month < cm)) return 'past'
  if (year === cy && month === cm) return 'current'
  return 'future'
}

/**
 * A transaction can only be paid in past or current context, and only if pending or partial.
 */
function canPayTransaction(tx, context) {
  if (context === 'future') return false
  return tx.status === 'pending' || tx.status === 'partial'
}

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  apiUrl: '',
  webUrl: '',
  orgSlug: '',
  token: '',
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  reports: null,
  orgs: [],
  investments: null,
  reminders: null,
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function resolveToken() {
  const stored = await chrome.storage.local.get(['token', 'webUrl'])

  if (stored.token) {
    // Verify cached token is still valid
    try {
      await apiFetchWithToken(stored.token, '/profile')
      return stored.token
    } catch (e) {
      if (e.status === 401) {
        // Token expired, try reading cookie from web app
        await chrome.storage.local.remove('token')
        if (stored.webUrl) {
          try {
            const cookie = await chrome.cookies.get({ url: stored.webUrl, name: 'houseapp' })
            if (cookie?.value) {
              await chrome.storage.local.set({ token: cookie.value })
              return cookie.value
            }
          } catch (_) {}
        }
        return null
      }
      throw e
    }
  }

  if (stored.webUrl) {
    try {
      const cookie = await chrome.cookies.get({ url: stored.webUrl, name: 'houseapp' })
      if (cookie?.value) {
        await chrome.storage.local.set({ token: cookie.value })
        return cookie.value
      }
    } catch (_) {}
  }
  return null
}

async function apiFetchWithToken(token, path, opts = {}) {
  const res = await fetch(`${state.apiUrl}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (res.status === 401) throw Object.assign(new Error('unauthorized'), { status: 401 })
  return res
}

// ── API ───────────────────────────────────────────────────────────────────────

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${state.apiUrl}${path}`, {
    ...opts,
    headers: { ...authHeaders(state.token), ...(opts.headers || {}) },
  })
  if (res.status === 401) throw Object.assign(new Error('unauthorized'), { status: 401 })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status, body: text })
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : null
}

async function fetchInvestmentReminders() {
  const data = await apiFetch('/me/investments/reminders')
  state.investments = data.reminders || data
  return state.investments
}

async function fetchReminders() {
  const data = await apiFetch(`/org/${state.orgSlug}/reminders?includeCompleted=true`)
  state.reminders = data.reminders || data
  return state.reminders
}

// ── Render helpers ────────────────────────────────────────────────────────────

function typeIndicator(type) {
  if (type === 'income')  return '<span class="type-dot income"  title="Receita">▲</span>'
  if (type === 'expense') return '<span class="type-dot expense" title="Despesa">▼</span>'
  return ''
}

/** metaLabel is a calendar date (DD/MM), not a relative label like "27d". */
function isDateMetaLabel(metaLabel) {
  return /^\d{1,2}\/\d{2}$/.test(metaLabel)
}

function stripStatusLinePrefix(line, metaLabel) {
  let result = line.replace(/\s*·\s*Transbordo\s*$/i, '').trim()
  if (metaLabel && result.startsWith(metaLabel)) {
    result = result.slice(metaLabel.length).replace(/^\s*·\s*/, '').trim()
  }
  return result
    .replace(/^\d+d\s*·\s*/i, '')
    .replace(/^Vencid[oa](\s*·\s*)?/i, '')
    .trim()
}

/**
 * Compact subtitle — overdue days + transbordo venc. date.
 * Overdue days go in the sub line when metaLabel is a date (Todas do mês);
 * Vencidas keeps days in metaLabel and only shows venc. here.
 */
function buildMetaSubLine(metaLabel, display, tx) {
  if (!display) return null

  const parts = []
  const showOverdueInSub = isDateMetaLabel(metaLabel)
  const overdueDays = display.overdueDays

  if (display.isPaidAtRepositioned && tx?.status === 'paid') {
    if (showOverdueInSub && overdueDays != null && overdueDays > 0) {
      parts.push(`${overdueDays}d venc.`)
    }
    if (tx.dueDate) {
      parts.push(`venc. ${fmtDate(tx.dueDate)}`)
    }
    return parts.length > 0 ? parts.join(' · ') : null
  }

  if (showOverdueInSub && overdueDays != null && overdueDays > 0) {
    parts.push(`${overdueDays}d venc.`)
  }

  if (display.isTransbordoRepositioned) {
    const vencMatch = display.description?.match(/venc\.\s*[\d/]+/)
    if (vencMatch) {
      parts.push(vencMatch[0])
    } else if (display.statusLine) {
      const line = stripStatusLinePrefix(display.statusLine, metaLabel)
      if (line) parts.push(line)
    }
  } else if (display.isTransbordo && display.statusLine) {
    const line = stripStatusLinePrefix(display.statusLine, metaLabel)
    if (line) parts.push(line)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * Single reusable transaction item renderer.
 * @param {object} tx         - Transaction data
 * @param {string} context    - 'past' | 'current' | 'future'
 * @param {string} metaLabel  - Text shown in the meta column (date, days, etc.)
 * @param {object} [display]  - Optional transbordo display metadata from TransactionDisplay
 */
function renderTransactionItem(tx, context, metaLabel, display) {
  const li = document.createElement('li')
  li.className = 'tx-item'
  li.dataset.id = tx.id

  if (tx.status === 'paid') li.classList.add('paid')
  if (tx.status === 'partial') li.classList.add('partial')
  if (display?.isTransbordo && tx.status !== 'paid') li.classList.add('transbordo')

  const canPay = canPayTransaction(tx, context)
  const tooltipParts = [tx.title]
  if (display?.description) tooltipParts.push(display.description)
  if (display?.statusLine) tooltipParts.push(display.statusLine)
  const titleTooltip = escapeHtml(tooltipParts.join(' · '))

  let actionHtml = ''
  if (canPay) {
    const label = tx.status === 'partial' ? 'Pagar resto' : 'Pagar'
    actionHtml = `<button class="btn-pay" data-id="${tx.id}">${label}</button>`
  } else if (context === 'future') {
    actionHtml = '<span class="badge badge-future">Prevista</span>'
  } else if (tx.status === 'paid') {
    actionHtml = '<span class="badge badge-paid">Paga</span>'
  } else if (tx.status === 'partial') {
    actionHtml = '<span class="badge badge-partial">Parcial</span>'
  }

  const metaSubLine = buildMetaSubLine(metaLabel, display, tx)
  const metaSub = metaSubLine
    ? `<span class="tx-meta-sub">${escapeHtml(metaSubLine)}</span>`
    : ''
  const transbordoBadge =
    display?.isTransbordo && tx.status !== 'paid'
      ? '<span class="badge badge-transbordo">Transbordo</span>'
      : ''
  const useStacked = Boolean(actionHtml || display?.isTransbordo || metaSubLine)

  if (useStacked) {
    li.classList.add('tx-item-stacked')
    li.innerHTML = `
      <div class="tx-row tx-row-top">
        ${typeIndicator(tx.type)}
        <span class="tx-title" title="${titleTooltip}">${escapeHtml(tx.title)}</span>
        <span class="tx-amount">${fmt(tx.amount)}</span>
      </div>
      <div class="tx-row tx-row-bottom">
        <div class="tx-row-meta">
          <span class="tx-meta">${escapeHtml(metaLabel)}</span>
          ${metaSub}
          ${transbordoBadge}
        </div>
        ${actionHtml ? `<div class="tx-item-actions">${actionHtml}</div>` : ''}
      </div>
    `
  } else {
    li.innerHTML = `
      ${typeIndicator(tx.type)}
      <span class="tx-title" title="${titleTooltip}">${escapeHtml(tx.title)}</span>
      <span class="tx-meta">${escapeHtml(metaLabel)}</span>
      <span class="tx-amount">${fmt(tx.amount)}</span>
    `
  }

  if (canPay) {
    li.querySelector('.btn-pay').addEventListener('click', (e) => {
      e.stopPropagation()
      handlePay(tx.id, li, tx)
    })
  }

  return li
}

// ── Render sections ───────────────────────────────────────────────────────────

function renderKpis(reports, context) {
  const kpis = reports.kpis || {}

  document.getElementById('label-income').textContent  = context === 'future' ? 'Prev. receber' : 'A receber'
  document.getElementById('label-expense').textContent = context === 'future' ? 'Prev. pagar'   : 'A pagar'

  const incomeEl  = document.getElementById('kpi-income')
  const expenseEl = document.getElementById('kpi-expense')
  incomeEl.classList.toggle('projected', context === 'future')
  expenseEl.classList.toggle('projected', context === 'future')

  incomeEl.textContent  = fmt(kpis.toReceiveTotal ?? 0)
  expenseEl.textContent = fmt(kpis.toSpendTotal   ?? 0)

  const balance = (kpis.toReceiveTotal ?? 0) - (kpis.toSpendTotal ?? 0)
  const balEl = document.getElementById('kpi-balance')
  balEl.textContent = fmt(balance)
  balEl.className = `kpi-value balance${balance >= 0 ? '' : ' expense'}`
}

function sectionTransbordoDisplay(meta) {
  if (!meta?.isTransbordo) return null
  return meta
}

function isOpenTransaction(tx) {
  return tx.status === 'pending' || tx.status === 'partial'
}

function isOpenTransbordoItem(item) {
  return item.isTransbordo && isOpenTransaction(item.transaction)
}

function renderOverdue(reports, context, year, month) {
  const section = document.getElementById('section-overdue')
  const list    = document.getElementById('list-overdue')
  const title   = document.getElementById('overdue-title')

  list.innerHTML = ''

  // No "overdue" concept for future months
  if (context === 'future') {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  const pool = TransactionDisplay.mergeReportTransactions(reports)
  const overdueTransactions = reports?.overdueTransactions?.transactions
  const upcomingAlerts = reports?.upcomingAlerts?.transactions

  // Use client-side midnight to correctly handle server/browser timezone differences
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  const overdue = (overdueTransactions || [])
    .filter(isOpenTransaction)
    .map(tx => ({
      ...tx,
      _days: tx.overdueDays || 0,
    }))

  // Any upcoming alert whose actual dueDate is before today belongs in vencidas
  const alsoOverdue = (upcomingAlerts || [])
    .filter(tx => isOpenTransaction(tx) && new Date(tx.dueDate) < todayMidnight)
    .map(tx => {
      const diffMs = todayMidnight.getTime() - new Date(tx.dueDate).getTime()
      return { ...tx, _days: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) }
    })

  // Deduplicate by id (overdueTransactions and alsoOverdue may overlap)
  const seenIds = new Set(overdue.map(tx => tx.id))
  const uniqueAlsoOverdue = alsoOverdue.filter(tx => !seenIds.has(tx.id))

  const allRaw = [...overdue, ...uniqueAlsoOverdue]
  const all = allRaw.filter(tx => {
    const displayMeta = TransactionDisplay.getTransactionDisplayMetadata(
      tx,
      pool,
      year,
      month,
      todayMidnight
    )
    return !displayMeta.isTransbordo
  })
  const totalOverdue = all.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
  title.textContent = `Vencidas (${fmt(totalOverdue)})`

  if (!all.length) { section.classList.add('hidden'); return }
  section.classList.remove('hidden')

  for (const tx of all) {
    const days = tx._days
    const meta = days === 0 ? 'hoje' : days === 1 ? '1 dia' : `${days}d`
    const displayMeta = TransactionDisplay.getTransactionDisplayMetadata(
      tx,
      pool,
      year,
      month,
      todayMidnight
    )
    list.appendChild(renderTransactionItem(tx, context, meta, sectionTransbordoDisplay(displayMeta)))
  }
}

function renderUpcoming(reports, context, year, month) {
  const section = document.getElementById('section-upcoming')
  const list    = document.getElementById('list-upcoming')
  const title   = document.getElementById('upcoming-title')

  list.innerHTML = ''

  // Only show upcoming section for current month
  if (context !== 'current') {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  const pool = TransactionDisplay.mergeReportTransactions(reports)
  const upcomingAlerts = reports?.upcomingAlerts?.transactions

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  // Only show transactions with dueDate strictly in the future (client-side check)
  const upcoming = (upcomingAlerts || [])
    .filter(tx => isOpenTransaction(tx) && new Date(tx.dueDate) >= todayMidnight)
  title.textContent = `Próximas (${upcoming.length})`

  if (!upcoming.length) { section.classList.add('hidden'); return }
  section.classList.remove('hidden')

  for (const tx of upcoming) {
    const due = new Date(tx.dueDate)
    due.setHours(0, 0, 0, 0)
    const d = Math.round((+due - +todayMidnight) / (1000 * 60 * 60 * 24))
    const meta = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `${d} dias`
    const displayMeta = TransactionDisplay.getTransactionDisplayMetadata(
      tx,
      pool,
      year,
      month,
      todayMidnight
    )
    list.appendChild(renderTransactionItem(tx, context, meta, sectionTransbordoDisplay(displayMeta)))
  }
}

function renderTransbordo(reports, context, year, month) {
  const section = document.getElementById('section-transbordo')
  const list = document.getElementById('list-transbordo')
  const title = document.getElementById('transbordo-title')

  list.innerHTML = ''

  const pool = TransactionDisplay.mergeReportTransactions(reports)
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const items = TransactionDisplay.getMonthTransactionsForDisplay(
    pool,
    year,
    month,
    todayMidnight
  )
    .filter(isOpenTransbordoItem)
    .sort((a, b) => (b.overdueDays ?? 0) - (a.overdueDays ?? 0))

  title.textContent = `Transbordo (${items.length})`

  if (!items.length) {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  for (const item of items) {
    const [, m, d] = item.displayKey.split('-').map(Number)
    const metaLabel = `${d}/${String(m).padStart(2, '0')}`
    list.appendChild(renderTransactionItem(item.transaction, context, metaLabel, item))
  }
}

function renderAllTransactions(reports, context, year, month) {
  const section = document.getElementById('section-all')
  const list  = document.getElementById('list-all')
  const title = document.getElementById('all-title')

  list.innerHTML = ''

  const pool = TransactionDisplay.mergeReportTransactions(reports)
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const items = TransactionDisplay.getMonthTransactionsForDisplay(
    pool,
    year,
    month,
    todayMidnight
  ).filter(item => !isOpenTransbordoItem(item))

  title.textContent = `Todas do mês (${items.length})`

  if (!items.length) { section.classList.add('hidden'); return }
  section.classList.remove('hidden')

  const byDate = new Map()
  for (const item of items) {
    if (!byDate.has(item.displayKey)) byDate.set(item.displayKey, [])
    byDate.get(item.displayKey).push(item)
  }

  for (const displayKey of [...byDate.keys()].sort()) {
    const dateItems = byDate.get(displayKey)
    const [, m, d] = displayKey.split('-').map(Number)
    const metaLabel = `${d}/${String(m).padStart(2, '0')}`

    for (const item of dateItems) {
      list.appendChild(renderTransactionItem(item.transaction, context, metaLabel, item))
    }
  }
}

function getEndOfDueMonth(dueDate) {
  const d = new Date(dueDate)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function isReminderSnoozed(item) {
  return item.snoozedUntil && new Date(item.snoozedUntil) > new Date()
}

function fromDateKey(dateKey) {
  const [y, mo, d] = dateKey.split('-').map(Number)
  return new Date(y, mo - 1, d)
}

const {
  toDateKey,
  filterPendingRemindersForMonth,
  isReminderOccurrenceCompleted,
  countOverdueReminders,
} = ReminderDisplay

let _loadDataInFlight = null

async function reloadReportsAndRender() {
  const data = await apiFetch(
    `/org/${state.orgSlug}/reports/transactions?year=${state.year}&month=${state.month}`
  )
  state.reports = data.reports || data
  const context = getViewingContext(state.year, state.month)
  renderKpis(state.reports, context)
  renderReminders(state.reminders, state.year, state.month)
  renderOverdue(state.reports, context, state.year, state.month)
  renderUpcoming(state.reports, context, state.year, state.month)
  renderTransbordo(state.reports, context, state.year, state.month)
  renderAllTransactions(state.reports, context, state.year, state.month)
}

async function reloadAfterReminderAction() {
  await fetchReminders()
  await reloadReportsAndRender()
  await refreshBadgeAllOrgs()
}

async function completeReminderPeriod(reminderId) {
  await apiFetch(`/org/${state.orgSlug}/reminders/${reminderId}/complete-period`, {
    method: 'POST',
  })
  await reloadAfterReminderAction()
}

async function completeReminderPeriodWithTransaction(reminderId, { amount, date, description }) {
  const body = { amount }
  if (date) body.date = date
  if (description) body.description = description
  await apiFetch(`/org/${state.orgSlug}/reminders/${reminderId}/complete-period-with-transaction`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  await reloadAfterReminderAction()
}

function reminderGeneratesTransaction(reminder) {
  return reminder.generatesTransaction === true
}

async function snoozeReminder(reminderId, body) {
  await apiFetch(`/org/${state.orgSlug}/reminders/${reminderId}/snooze`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  await fetchReminders()
  renderReminders(state.reminders, state.year, state.month)
  await refreshBadgeAllOrgs()
}

let _snoozeResolve = null
let _snoozeReminderItem = null

function openSnoozeModal(item) {
  const today = new Date().toISOString().split('T')[0]
  const maxDate = getEndOfDueMonth(item.dueDate).toISOString().split('T')[0]
  const input = document.getElementById('snooze-date')
  input.min = today
  input.max = maxDate
  input.value = today
  document.getElementById('snooze-hint').textContent =
    `Máximo: ${maxDate.split('-').reverse().join('/')} (fim do mês do vencimento)`
  _snoozeReminderItem = item
  document.getElementById('snooze-modal').classList.remove('hidden')
  return new Promise(resolve => { _snoozeResolve = resolve })
}

function closeSnoozeModal(result) {
  document.getElementById('snooze-modal').classList.add('hidden')
  _snoozeReminderItem = null
  if (_snoozeResolve) { _snoozeResolve(result); _snoozeResolve = null }
}

function renderReminders(reminders, year, month) {
  const section = document.getElementById('section-reminders')
  const list = document.getElementById('list-reminders')
  const title = document.getElementById('reminders-title')

  list.innerHTML = ''
  const items = filterPendingRemindersForMonth(reminders, year, month)
  title.textContent = `Lembretes (${items.length})`

  if (!items.length) {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  for (const { reminder: item, occurrenceDateKey, isTransbordo } of items) {
    const li = document.createElement('li')
    li.className = 'tx-item'
    li.dataset.id = item.id
    const due = fromDateKey(occurrenceDateKey)
    const d = Math.round((+due - +todayMidnight) / (1000 * 60 * 60 * 24))
    const completed = isReminderOccurrenceCompleted(item, occurrenceDateKey)
    const isActiveOccurrence = occurrenceDateKey === toDateKey(item.dueDate) && !completed
    const meta = completed
      ? fmtDate(due.toISOString())
      : d < 0
        ? `${Math.abs(d)}d atraso`
        : d === 0
          ? 'hoje'
          : d === 1
            ? 'amanhã'
            : `${d} dias`
    const amount = item.amountCents != null ? fmt(item.amountCents / 100) : '—'
    const snoozed = isActiveOccurrence && isReminderSnoozed(item)
    const badgeClass = completed
      ? 'badge-completed'
      : snoozed
        ? 'badge-snoozed'
        : isTransbordo
          ? 'badge-transbordo'
          : d < 0
            ? 'badge-overdue'
            : 'badge-reminder'
    const badgeLabel = completed
      ? 'Concluído'
      : snoozed
        ? 'Adiado'
        : d < 0
          ? isTransbordo
            ? 'Transbordo'
            : 'Vencido'
          : 'Lembrete'
    const snoozeTitle = snoozed && item.snoozedUntil
      ? `Adiado até ${fmtDate(item.snoozedUntil)}`
      : 'Adiar'
    const safeTitle = escapeHtml(item.title)
    const safeMeta = escapeHtml(meta)
    const safeSnoozeTitle = escapeHtml(snoozeTitle)

    li.classList.add('reminder-item')
    if (completed) li.classList.add('paid')
    li.innerHTML = `
      <div class="reminder-row reminder-row-top">
        <span class="type-dot reminder">◆</span>
        <span class="tx-title" title="${safeTitle}">${safeTitle}</span>
        <span class="tx-amount">${amount}</span>
      </div>
      <div class="reminder-row reminder-row-bottom">
        <span class="tx-meta">${safeMeta}</span>
        <div class="reminder-actions">
          <button class="btn-reminder-done" title="Feito no mês">✓</button>
          <select class="reminder-snooze-select" title="${safeSnoozeTitle}" aria-label="Adiar lembrete">
            <option value="">Adiar</option>
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="custom">Até data...</option>
          </select>
          <span class="badge ${badgeClass}" title="${safeSnoozeTitle}">${badgeLabel}</span>
        </div>
      </div>
    `

    const doneBtn = li.querySelector('.btn-reminder-done')
    const snoozeSelect = li.querySelector('.reminder-snooze-select')

    if (!doneBtn || !snoozeSelect) {
      console.warn('[HouseApp] reminder row controls missing for', item.id)
      list.appendChild(li)
      continue
    }

    if (!isActiveOccurrence) {
      doneBtn.disabled = true
      snoozeSelect.disabled = true
    } else {
      doneBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        const btn = e.currentTarget
        btn.disabled = true

        try {
          if (reminderGeneratesTransaction(item)) {
            const result = await openCompleteReminderTransactionModal(item, occurrenceDateKey)
            if (!result) return

            await completeReminderPeriodWithTransaction(item.id, result)
          } else {
            if (!await showConfirm(`Marcar "${item.title}" como feito neste mês?`)) return
            await completeReminderPeriod(item.id)
          }
        } catch (err) {
          console.error('[HouseApp] complete-period error:', err)
          showAlert('Erro ao marcar como feito')
        } finally {
          if (btn) btn.disabled = false
        }
      })
    }

    snoozeSelect.addEventListener('change', async (e) => {
      if (!isActiveOccurrence) return
      e.stopPropagation()
      const value = e.target.value
      e.target.value = ''
      if (!value) return

      try {
        if (value === 'custom') {
          const choice = await openSnoozeModal(item)
          if (!choice) return
          await snoozeReminder(item.id, { until: choice.until })
        } else {
          await snoozeReminder(item.id, { days: Number(value) })
        }
      } catch (err) {
        console.error('[HouseApp] snooze error:', err)
        showAlert('Erro ao adiar lembrete')
      }
    })

    list.appendChild(li)
  }
}

function renderInvestments(reminders) {
  const section = document.getElementById('section-investments')
  const list = document.getElementById('list-investments')
  const title = document.getElementById('investments-title')

  list.innerHTML = ''
  const items = reminders?.items || []
  title.textContent = `Aportes do mês (${items.length})`

  if (!items.length) {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  for (const item of items) {
    const li = document.createElement('li')
    li.className = 'tx-item clickable'
    const amount = item.plannedAmount ? fmt(item.plannedAmount) : `${item.plannedQuantity} un.`
    li.innerHTML = `
      <span class="type-dot income">◆</span>
      <span class="tx-title" title="${item.assetName}">${item.assetSymbol}</span>
      <span class="tx-meta">${item.referenceMonth}</span>
      <span class="tx-amount">${amount}</span>
      <span class="badge ${item.status === 'overdue' ? 'badge-overdue' : 'badge-invest'}">
        ${item.status === 'overdue' ? 'Atrasado' : 'Pendente'}
      </span>
    `

    li.addEventListener('click', () => {
      chrome.storage.local.get('webUrl').then(({ webUrl }) => {
        const base = webUrl || 'https://houseapp.com.br'
        const url = new URL('/investments', base)
        url.searchParams.set('action', 'register')
        url.searchParams.set('assetId', item.assetId)
        url.searchParams.set('planId', item.planId)
        url.searchParams.set('referenceMonth', item.referenceMonth)
        chrome.tabs.create({ url: url.toString() })
      })
    })

    list.appendChild(li)
  }
}

function renderMonthLabel() {
  document.getElementById('month-label').textContent =
    `${MONTHS[state.month - 1]} de ${state.year}`
}

function renderOrgSelect() {
  const sel = document.getElementById('org-select')
  sel.innerHTML = ''
  for (const org of state.orgs) {
    const opt = document.createElement('option')
    opt.value = org.slug
    opt.textContent = org.name
    opt.selected = org.slug === state.orgSlug
    sel.appendChild(opt)
  }
  sel.classList.toggle('hidden', state.orgs.length <= 1)
}

// ── Actions ───────────────────────────────────────────────────────────────────

// ── Badge ─────────────────────────────────────────────────────────────────────

function todayMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function countOverdueTransactions(reports) {
  const today = todayMidnight()
  const overdue = (reports.overdueTransactions?.transactions || [])
    .filter(t => t.status === 'pending' || t.status === 'partial')
  const alsoOverdue = (reports.upcomingAlerts?.transactions || [])
    .filter(t => (t.status === 'pending' || t.status === 'partial') && new Date(t.dueDate) < today)
  const seenIds = new Set(overdue.map(t => t.id))
  return overdue.length + alsoOverdue.filter(t => !seenIds.has(t.id)).length
}

function updateBadge(overdueCount = 0) {
  if (overdueCount === 0) { chrome.action.setBadgeText({ text: '' }); return }
  chrome.action.setBadgeText({ text: String(overdueCount) })
  chrome.action.setBadgeTextColor({ color: '#ffffff' })
  chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
}

async function refreshBadgeAllOrgs() {
  if (!state.orgs?.length) return

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const results = await Promise.all(
    state.orgs.map(org =>
      apiFetch(`/org/${org.slug}/reports/transactions?year=${year}&month=${month}`)
        .then(data => ({ slug: org.slug, reports: data.reports || data }))
        .catch(() => null)
    )
  )

  const reminderResults = await Promise.all(
    state.orgs.map(org =>
      apiFetch(`/org/${org.slug}/reminders?includeCompleted=true`)
        .then(data => data.reminders || data)
        .catch(() => [])
    )
  )

  let totalOverdue = 0
  const newCache = {}

  for (const orgData of results.filter(Boolean)) {
    totalOverdue += countOverdueTransactions(orgData.reports)
    newCache[orgData.slug] = orgData.reports
  }
  for (const reminders of reminderResults) {
    totalOverdue += countOverdueReminders(reminders, year, month)
  }

  updateBadge(totalOverdue)
  await chrome.storage.local.set({
    cachedReportsByOrg: newCache,
    badgeTotals: { overdue: totalOverdue },
  })
}

// ── Confirm / alert modal ─────────────────────────────────────────────────────

let _confirmResolve = null

function showConfirm(message, { confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) {
  document.getElementById('confirm-message').textContent = message
  document.getElementById('confirm-cancel').textContent = cancelLabel
  document.getElementById('confirm-ok').textContent = confirmLabel
  document.getElementById('confirm-cancel').classList.remove('hidden')
  document.getElementById('confirm-modal').classList.remove('hidden')
  return new Promise(resolve => { _confirmResolve = resolve })
}

function showAlert(message) {
  document.getElementById('confirm-message').textContent = message
  document.getElementById('confirm-ok').textContent = 'OK'
  document.getElementById('confirm-cancel').classList.add('hidden')
  document.getElementById('confirm-modal').classList.remove('hidden')
  return new Promise(resolve => { _confirmResolve = resolve })
}

function closeConfirmModal(result) {
  document.getElementById('confirm-modal').classList.add('hidden')
  document.getElementById('confirm-cancel').classList.remove('hidden')
  if (_confirmResolve) { _confirmResolve(result); _confirmResolve = null }
}

document.getElementById('confirm-cancel').addEventListener('click', () => closeConfirmModal(false))
document.getElementById('confirm-ok').addEventListener('click', () => closeConfirmModal(true))

// ── Complete reminder with transaction modal ───────────────────────────────────

let _completeReminderResolve = null
let _completeReminderItem = null
let _completeReminderAmountTouched = false
let _completeReminderSubmitAttempted = false

const _completeReminderAmountInput = document.getElementById('complete-reminder-amount')
const _completeReminderAmountError = document.getElementById('complete-reminder-amount-error')
const _completeReminderAmountHintForm = document.getElementById('complete-reminder-amount-hint-form')
const _completeReminderConfirmBtn = document.getElementById('complete-reminder-confirm')

function getCompleteReminderAmountValue() {
  return _completeReminderAmountInput ? parseCurrency(_completeReminderAmountInput.value) : 0
}

function isCompleteReminderAmountValid() {
  const amount = getCompleteReminderAmountValue()
  return amount > 0
}

function updateCompleteReminderValidationUI() {
  if (!_completeReminderAmountInput || !_completeReminderAmountError || !_completeReminderConfirmBtn) return
  const showError = (_completeReminderAmountTouched || _completeReminderSubmitAttempted) && !isCompleteReminderAmountValid()
  _completeReminderAmountError.classList.toggle('hidden', !showError)
  _completeReminderAmountInput.classList.toggle('input-error', showError)
  _completeReminderConfirmBtn.disabled = !isCompleteReminderAmountValid() || _completeReminderConfirmBtn.dataset.loading === 'true'
}

function resetCompleteReminderModalForm(defaultDateKey) {
  _completeReminderAmountTouched = false
  _completeReminderSubmitAttempted = false
  if (!_completeReminderAmountInput || !_completeReminderConfirmBtn) return
  _completeReminderAmountInput.value = ''
  document.getElementById('complete-reminder-date').value = defaultDateKey || toDateKey(new Date())
  const descInput = document.getElementById('complete-reminder-description')
  descInput.value = ''
  descInput.placeholder = 'Descrição da transação'
  _completeReminderAmountError?.classList.add('hidden')
  _completeReminderAmountHintForm?.classList.add('hidden')
  _completeReminderAmountInput.classList.remove('input-error')
  _completeReminderConfirmBtn.disabled = true
  delete _completeReminderConfirmBtn.dataset.loading
  _completeReminderConfirmBtn.textContent = 'Registrar e concluir'
}

function openCompleteReminderTransactionModal(reminder, occurrenceDateKey) {
  if (!_completeReminderAmountInput || !_completeReminderConfirmBtn) {
    console.error('[HouseApp] complete-reminder modal elements missing from popup.html')
    return Promise.resolve(null)
  }

  resetCompleteReminderModalForm(occurrenceDateKey)
  _completeReminderItem = reminder

  document.getElementById('complete-reminder-title').textContent = reminder.title

  const amountHintEl = document.getElementById('complete-reminder-amount-hint')
  const descInput = document.getElementById('complete-reminder-description')

  if (reminder.amountCents != null) {
    const formatted = fmt(reminder.amountCents / 100)
    amountHintEl.textContent = `Valor estimado: ${formatted}`
    _completeReminderAmountHintForm.textContent = 'Use o valor estimado como referência ou informe o valor da fatura.'
    _completeReminderAmountHintForm.classList.remove('hidden')
    const centavos = reminder.amountCents
    _completeReminderAmountInput.value = maskCurrency(String(centavos))
  } else {
    amountHintEl.textContent = 'Valor variável — informe na conclusão'
    descInput.placeholder = reminder.notes || 'Descrição da transação'
  }

  if (reminder.notes) {
    descInput.value = reminder.notes
    if (!descInput.placeholder || descInput.placeholder === 'Descrição da transação') {
      descInput.placeholder = reminder.notes
    }
  } else {
    descInput.placeholder = 'Descrição da transação'
  }

  updateCompleteReminderValidationUI()
  document.getElementById('complete-reminder-modal').classList.remove('hidden')
  window.setTimeout(() => _completeReminderAmountInput.focus(), 0)

  return new Promise(resolve => { _completeReminderResolve = resolve })
}

function closeCompleteReminderTransactionModal(result) {
  document.getElementById('complete-reminder-modal').classList.add('hidden')
  _completeReminderItem = null
  if (_completeReminderResolve) {
    _completeReminderResolve(result)
    _completeReminderResolve = null
  }
}

if (_completeReminderAmountInput) {
  _completeReminderAmountInput.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '')
    e.target.value = maskCurrency(digits)
    if (isCompleteReminderAmountValid()) {
      _completeReminderSubmitAttempted = false
    }
    updateCompleteReminderValidationUI()
  })

  _completeReminderAmountInput.addEventListener('blur', () => {
    _completeReminderAmountTouched = true
    updateCompleteReminderValidationUI()
  })
}

document.getElementById('complete-reminder-cancel')?.addEventListener('click', () => {
  closeCompleteReminderTransactionModal(null)
})

document.getElementById('complete-reminder-confirm')?.addEventListener('click', () => {
  _completeReminderSubmitAttempted = true
  updateCompleteReminderValidationUI()
  if (!isCompleteReminderAmountValid()) return

  const amount = getCompleteReminderAmountValue()
  const date = document.getElementById('complete-reminder-date').value
  const description = document.getElementById('complete-reminder-description').value.trim()
  closeCompleteReminderTransactionModal({
    amount: amount.toFixed(2),
    date: date || undefined,
    description: description || undefined,
  })
})

// ── Pay modal ─────────────────────────────────────────────────────────────────

function maskCurrency(digits) {
  if (!digits) return ''
  const num = parseInt(digits.replace(/\D/g, '') || '0', 10)
  const reais = Math.floor(num / 100)
  const centavos = num % 100
  return `${reais.toLocaleString('pt-BR')},${String(centavos).padStart(2, '0')}`
}

function parseCurrency(masked) {
  // "1.234,56" → 1234.56
  return parseFloat(masked.replace(/\./g, '').replace(',', '.')) || 0
}

const _amountInput = document.getElementById('pay-amount')
_amountInput.addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '')
  e.target.value = maskCurrency(digits)
})

let _payResolve = null

function openPayModal(tx) {
  const dueDateStr = tx.dueDate ? tx.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]
  document.getElementById('pay-date').value = dueDateStr

  // For partial transactions, pre-fill with remaining amount
  let amountToFill = tx.amount
  if (tx.status === 'partial' && tx.valuePaid != null) {
    const remaining = tx.amount - tx.valuePaid / 100
    amountToFill = remaining > 0 ? remaining : tx.amount
  }
  const centavos = Math.round(amountToFill * 100)
  document.getElementById('pay-amount').value = maskCurrency(String(centavos))
  document.getElementById('pay-modal').classList.remove('hidden')

  return new Promise(resolve => { _payResolve = resolve })
}

function closePayModal(result) {
  document.getElementById('pay-modal').classList.add('hidden')
  if (_payResolve) { _payResolve(result); _payResolve = null }
}

document.getElementById('btn-today').addEventListener('click', () => {
  document.getElementById('pay-date').value = new Date().toISOString().split('T')[0]
})

document.getElementById('btn-complete-reminder-today')?.addEventListener('click', () => {
  document.getElementById('complete-reminder-date').value = toDateKey(new Date())
})

document.getElementById('snooze-cancel').addEventListener('click', () => closeSnoozeModal(null))
document.getElementById('snooze-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('snooze-date').value
  if (!dateVal) { showAlert('Informe a data'); return }
  closeSnoozeModal({ type: 'until', until: new Date(dateVal).toISOString() })
})

document.getElementById('pay-cancel').addEventListener('click', () => closePayModal(null))
document.getElementById('pay-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('pay-date').value
  const amount  = parseCurrency(document.getElementById('pay-amount').value)
  if (!dateVal) { showAlert('Informe a data do pagamento'); return }
  if (!amount || amount <= 0) { showAlert('Informe o valor pago'); return }
  closePayModal({ paidAt: new Date(dateVal).toISOString(), paidAmount: amount })
})

function updateTransactionInReports(txId, updates) {
  for (const list of [
    state.reports?.overdueTransactions?.transactions,
    state.reports?.upcomingAlerts?.transactions,
    state.reports?.allTransactions,
    state.reports?.paidThisMonth?.transactions,
  ]) {
    const found = (list || []).find(t => t.id === txId)
    if (found) Object.assign(found, updates)
  }
}

function rerenderTransactionSections() {
  const context = getViewingContext(state.year, state.month)
  renderOverdue(state.reports, context, state.year, state.month)
  renderUpcoming(state.reports, context, state.year, state.month)
  renderTransbordo(state.reports, context, state.year, state.month)
  renderAllTransactions(state.reports, context, state.year, state.month)
}

async function handlePay(txId, liEl, tx) {
  const result = await openPayModal(tx)
  if (!result) return  // cancelled

  const btn = liEl.querySelector('.btn-pay')
  if (!btn) return
  btn.disabled = true
  btn.textContent = '...'

  try {
    // If amount changed from original and it's not partial (partial amount is always the remaining)
    const referenceAmount = tx.status === 'partial' && tx.valuePaid != null
      ? tx.amount - tx.valuePaid / 100
      : tx.amount
    const amountChanged = Math.abs(result.paidAmount - referenceAmount) >= 0.01

    // Always send paidAmount for partial transactions (the additional amount)
    const body = {
      paidAt: result.paidAt,
    }
    if (tx.status === 'partial' || amountChanged) {
      body.paidAmount = result.paidAmount
    }

    await apiFetch(`/org/${state.orgSlug}/transaction/${txId}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })

    const totalAmount = tx.amount
    const wasPartial = tx.status === 'partial'
    const previousPaid = wasPartial && tx.valuePaid != null ? tx.valuePaid / 100 : 0
    const newPaidTotal = previousPaid + result.paidAmount
    const fullyPaid = Math.abs(newPaidTotal - totalAmount) < 0.01

    updateTransactionInReports(txId, fullyPaid
      ? { status: 'paid', paidAt: result.paidAt, valuePaid: null }
      : { status: 'partial', paidAt: result.paidAt, valuePaid: Math.round(newPaidTotal * 100) }
    )

    await refreshBadgeAllOrgs()
    rerenderTransactionSections()
  } catch (err) {
    console.error('[HouseApp] pay error:', err, err.body)
    btn.disabled = false
    const label = tx.status === 'partial' ? 'Pagar resto' : 'Pagar'
    btn.textContent = label
    showAlert(`Erro ${err.status || ''}: ${err.body || err.message}`)
  }
}

async function loadData({ silent = false } = {}) {
  if (_loadDataInFlight) return _loadDataInFlight

  _loadDataInFlight = (async () => {
  if (!silent) showScreen('loading')
  try {
    const data = await apiFetch(
      `/org/${state.orgSlug}/reports/transactions?year=${state.year}&month=${state.month}`
    )
    state.reports = data.reports || data
    await fetchInvestmentReminders()
    await fetchReminders()

    const context = getViewingContext(state.year, state.month)

    renderMonthLabel()
    renderKpis(state.reports, context)
    renderInvestments(state.investments)
    renderReminders(state.reminders, state.year, state.month)
    renderOverdue(state.reports, context, state.year, state.month)
    renderUpcoming(state.reports, context, state.year, state.month)
    renderTransbordo(state.reports, context, state.year, state.month)
    renderAllTransactions(state.reports, context, state.year, state.month)

    await refreshBadgeAllOrgs()

    await chrome.storage.local.set({
      cachedReport: state.reports,
      cachedYear: state.year,
      cachedMonth: state.month,
    })

    showScreen('main')
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      showScreen('login')
      return
    }

    if (err.status === 403) {
      try {
        const orgsData = await apiFetch('/orgs')
        const orgs = orgsData.organizations || orgsData.orgs || orgsData
        if (orgs?.length) {
          state.orgs = orgs
          state.orgSlug = orgs.find(o => o.slug === state.orgSlug)?.slug || orgs[0].slug
          await chrome.storage.local.set({ orgSlug: state.orgSlug })
          renderOrgSelect()
          return loadData()
        }
      } catch (_) {}
    }

    showScreen('error')
  }
  })().finally(() => { _loadDataInFlight = null })

  return _loadDataInFlight
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  showScreen('loading')

  const stored = await chrome.storage.local.get(['apiUrl', 'webUrl', 'orgSlug'])
  state.apiUrl = stored.apiUrl || ''
  state.webUrl = stored.webUrl || ''

  if (!state.apiUrl) {
    showScreen('login')
    document.getElementById('screen-login').querySelector('p').textContent =
      'Configure a URL da API nas opções.'
    return
  }

  state.token = await resolveToken()
  if (!state.token) { showScreen('login'); return }

  try {
    await apiFetch('/profile')
  } catch (_) {
    await chrome.storage.local.remove('token')
    showScreen('login')
    return
  }

  try {
    const orgsData = await apiFetch('/orgs')
    const orgs = orgsData.organizations || orgsData.orgs || orgsData
    if (!orgs?.length) { showScreen('error'); return }
    state.orgs = orgs
    // Use stored slug if it still exists, otherwise fall back to first org
    state.orgSlug = orgs.find(o => o.slug === stored.orgSlug)?.slug || orgs[0].slug
    await chrome.storage.local.set({ orgSlug: state.orgSlug })
    renderOrgSelect()
  } catch (_) {
    showScreen('error')
    return
  }

  await loadData()
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('btn-refresh').addEventListener('click', async () => {
  const btn = document.getElementById('btn-refresh')
  btn.classList.add('spinning')
  btn.disabled = true
  await loadData()
  btn.classList.remove('spinning')
  btn.disabled = false
})

document.getElementById('btn-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage()
})

document.getElementById('btn-open-web').addEventListener('click', () => {
  chrome.storage.local.get('webUrl').then(({ webUrl }) => {
    chrome.tabs.create({ url: webUrl || 'https://houseapp.com.br' })
  })
})

document.getElementById('btn-login').addEventListener('click', () => {
  chrome.storage.local.get('webUrl').then(({ webUrl }) => {
    chrome.tabs.create({ url: webUrl || 'https://houseapp.com.br' })
  })
})

document.getElementById('btn-retry').addEventListener('click', () => loadData())

document.getElementById('org-select').addEventListener('change', async (e) => {
  state.orgSlug = e.target.value
  await chrome.storage.local.set({ orgSlug: state.orgSlug })
  loadData()
})

document.getElementById('btn-prev-month').addEventListener('click', () => {
  state.month--
  if (state.month < 1) { state.month = 12; state.year-- }
  loadData()
})

document.getElementById('btn-next-month').addEventListener('click', () => {
  state.month++
  if (state.month > 12) { state.month = 1; state.year++ }
  loadData()
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.token && state.orgSlug) {
    loadData({ silent: true })
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'data-updated' && state.token && state.orgSlug) {
    loadData({ silent: true })
  }
})

// ── Boot ──────────────────────────────────────────────────────────────────────
init()
