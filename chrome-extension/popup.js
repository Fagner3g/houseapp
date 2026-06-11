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

/**
 * Single reusable transaction item renderer.
 * @param {object} tx         - Transaction data
 * @param {string} context    - 'past' | 'current' | 'future'
 * @param {string} metaLabel  - Text shown in the meta column (date, days, etc.)
 */
function renderTransactionItem(tx, context, metaLabel) {
  const li = document.createElement('li')
  li.className = 'tx-item'
  li.dataset.id = tx.id

  if (tx.status === 'paid') li.classList.add('paid')
  if (tx.status === 'partial') li.classList.add('partial')

  const canPay = canPayTransaction(tx, context)

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

  li.innerHTML = `
    ${typeIndicator(tx.type)}
    <span class="tx-title" title="${tx.title}">${tx.title}</span>
    <span class="tx-meta">${metaLabel}</span>
    <span class="tx-amount">${fmt(tx.amount)}</span>
    ${actionHtml}
  `

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

function renderOverdue(overdueTransactions, upcomingAlerts, context) {
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

  // Use client-side midnight to correctly handle server/browser timezone differences
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  const overdue = (overdueTransactions || []).map(tx => ({
    ...tx,
    _days: tx.overdueDays || 0,
  }))

  // Any upcoming alert whose actual dueDate is before today belongs in vencidas
  const alsoOverdue = (upcomingAlerts || [])
    .filter(tx => new Date(tx.dueDate) < todayMidnight)
    .map(tx => {
      const diffMs = todayMidnight.getTime() - new Date(tx.dueDate).getTime()
      return { ...tx, _days: Math.ceil(diffMs / (1000 * 60 * 60 * 24)) }
    })

  // Deduplicate by id (overdueTransactions and alsoOverdue may overlap)
  const seenIds = new Set(overdue.map(tx => tx.id))
  const uniqueAlsoOverdue = alsoOverdue.filter(tx => !seenIds.has(tx.id))

  const all = [...overdue, ...uniqueAlsoOverdue]
  const totalOverdue = all.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
  title.textContent = `Vencidas (${fmt(totalOverdue)})`

  if (!all.length) { section.classList.add('hidden'); return }
  section.classList.remove('hidden')

  for (const tx of all) {
    const days = tx._days
    const meta = days === 0 ? 'hoje' : days === 1 ? '1 dia' : `${days}d`
    list.appendChild(renderTransactionItem(tx, context, meta))
  }
}

function renderUpcoming(upcomingAlerts, context) {
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

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  // Only show transactions with dueDate strictly in the future (client-side check)
  const upcoming = (upcomingAlerts || []).filter(tx => new Date(tx.dueDate) >= todayMidnight)
  title.textContent = `Próximas (${upcoming.length})`

  if (!upcoming.length) { section.classList.add('hidden'); return }
  section.classList.remove('hidden')

  for (const tx of upcoming) {
    const due = new Date(tx.dueDate)
    due.setHours(0, 0, 0, 0)
    const d = Math.round((+due - +todayMidnight) / (1000 * 60 * 60 * 24))
    const meta = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `${d} dias`
    list.appendChild(renderTransactionItem(tx, context, meta))
  }
}

function renderAllTransactions(allTransactions, context) {
  const section = document.getElementById('section-all')
  const list  = document.getElementById('list-all')
  const title = document.getElementById('all-title')

  list.innerHTML = ''

  const txs = allTransactions || []
  title.textContent = `Todas do mês (${txs.length})`

  if (!txs.length) { section.classList.add('hidden'); return }
  section.classList.remove('hidden')

  for (const tx of txs) {
    list.appendChild(renderTransactionItem(tx, context, fmtDate(tx.dueDate)))
  }
}

function getEndOfDueMonth(dueDate) {
  const d = new Date(dueDate)
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

function isReminderSnoozed(item) {
  return item.snoozedUntil && new Date(item.snoozedUntil) > new Date()
}

function toDateKey(isoString) {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isInDateKeyRange(dateKey, from, to) {
  return dateKey >= from && dateKey <= to
}

function getMonthDateKeyRange(year, month) {
  const m = String(month).padStart(2, '0')
  const lastDay = new Date(year, month, 0).getDate()
  return {
    from: `${year}-${m}-01`,
    to: `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  }
}

function fromDateKey(dateKey) {
  const [y, mo, d] = dateKey.split('-').map(Number)
  return new Date(y, mo - 1, d)
}

function addPeriod(date, type, interval) {
  const next = new Date(date)
  switch (type) {
    case 'weekly':
      next.setDate(next.getDate() + 7 * interval)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + interval)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval)
      break
  }
  return next
}

function subPeriod(date, type, interval) {
  const prev = new Date(date)
  switch (type) {
    case 'weekly':
      prev.setDate(prev.getDate() - 7 * interval)
      break
    case 'monthly':
      prev.setMonth(prev.getMonth() - interval)
      break
    case 'yearly':
      prev.setFullYear(prev.getFullYear() - interval)
      break
  }
  return prev
}

/** Mirrors web calendar getReminderOccurrenceDatesInRange. */
function getReminderOccurrenceDatesInRange(reminder, dateFrom, dateTo) {
  const untilKey = reminder.recurrenceUntil ? toDateKey(reminder.recurrenceUntil) : null

  if (!reminder.isRecurring || !reminder.recurrenceType) {
    const dueKey = toDateKey(reminder.dueDate)
    return isInDateKeyRange(dueKey, dateFrom, dateTo) ? [dueKey] : []
  }

  const type = reminder.recurrenceType
  const interval = reminder.recurrenceInterval || 1
  let current = new Date(reminder.dueDate)
  current.setHours(0, 0, 0, 0)

  while (toDateKey(current) > dateFrom) {
    const prev = subPeriod(current, type, interval)
    if (toDateKey(prev) >= toDateKey(current)) break
    current = prev
    current.setHours(0, 0, 0, 0)
  }

  const dates = []
  for (let i = 0; i < 500; i++) {
    const key = toDateKey(current)
    if (untilKey && key > untilKey) break
    if (key > dateTo) break
    if (isInDateKeyRange(key, dateFrom, dateTo)) {
      dates.push(key)
    }
    const next = addPeriod(current, type, interval)
    if (toDateKey(next) <= toDateKey(current)) break
    current = next
    current.setHours(0, 0, 0, 0)
  }

  return dates
}

/**
 * Include every reminder occurrence in the viewing month — pending or completed
 * (e.g. recurring reminder advanced to next month after "feito no mês").
 */
function filterRemindersForMonth(reminders, year, month) {
  const { from, to } = getMonthDateKeyRange(year, month)
  const result = []
  for (const reminder of reminders || []) {
    for (const occurrenceDateKey of getReminderOccurrenceDatesInRange(reminder, from, to)) {
      result.push({ reminder, occurrenceDateKey })
    }
  }
  return result
}

/** Mirrors web calendar isReminderOccurrenceCompleted. */
function isReminderOccurrenceCompleted(item, dateKey) {
  const currentDueKey = toDateKey(item.dueDate)

  if (!item.isRecurring || !item.recurrenceType) {
    return item.completedAt != null && currentDueKey === dateKey
  }

  if (dateKey < currentDueKey) return true
  if (dateKey > currentDueKey) return false

  return item.completedAt != null || item.lastCompletedPeriodKey != null
}

async function completeReminderPeriod(reminderId) {
  await apiFetch(`/org/${state.orgSlug}/reminders/${reminderId}/complete-period`, {
    method: 'POST',
  })
  await fetchReminders()
  renderReminders(state.reminders, state.year, state.month)
  await refreshBadgeAllOrgs()
}

async function snoozeReminder(reminderId, body) {
  await apiFetch(`/org/${state.orgSlug}/reminders/${reminderId}/snooze`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  await fetchReminders()
  renderReminders(state.reminders, state.year, state.month)
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
  const items = filterRemindersForMonth(reminders, year, month)
  title.textContent = `Lembretes (${items.length})`

  if (!items.length) {
    section.classList.add('hidden')
    return
  }
  section.classList.remove('hidden')

  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)

  for (const { reminder: item, occurrenceDateKey } of items) {
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
        : d < 0
          ? 'badge-overdue'
          : 'badge-reminder'
    const badgeLabel = completed
      ? 'Concluído'
      : snoozed
        ? 'Adiado'
        : d < 0
          ? 'Vencido'
          : 'Lembrete'
    const snoozeTitle = snoozed && item.snoozedUntil
      ? `Adiado até ${fmtDate(item.snoozedUntil)}`
      : 'Adiar'

    li.classList.add('reminder-item')
    if (completed) li.classList.add('paid')
    li.innerHTML = `
      <div class="reminder-row reminder-row-top">
        <span class="type-dot reminder">◆</span>
        <span class="tx-title" title="${item.title}">${item.title}</span>
        <span class="tx-amount">${amount}</span>
      </div>
      <div class="reminder-row reminder-row-bottom">
        <span class="tx-meta">${meta}</span>
        <div class="reminder-actions">
          <button class="btn-reminder-done" title="Feito no mês">✓</button>
          <select class="reminder-snooze-select" title="${snoozeTitle}" aria-label="Adiar lembrete">
            <option value="">Adiar</option>
            <option value="1">1 dia</option>
            <option value="3">3 dias</option>
            <option value="custom">Até data...</option>
          </select>
          <span class="badge ${badgeClass}" title="${snoozeTitle}">${badgeLabel}</span>
        </div>
      </div>
    `

    const doneBtn = li.querySelector('.btn-reminder-done')
    const snoozeSelect = li.querySelector('.reminder-snooze-select')

    if (!isActiveOccurrence) {
      doneBtn.disabled = true
      snoozeSelect.disabled = true
    } else {
      doneBtn.addEventListener('click', async (e) => {
        e.stopPropagation()
        if (!confirm(`Marcar "${item.title}" como feito neste mês?`)) return

        const btn = e.currentTarget
        btn.disabled = true
        try {
          await completeReminderPeriod(item.id)
        } catch (err) {
          console.error('[HouseApp] complete-period error:', err)
          btn.disabled = false
          alert('Erro ao marcar como feito')
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
        alert('Erro ao adiar lembrete')
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

function countOverdueReminders(reminders, year, month) {
  const today = todayMidnight()
  return filterRemindersForMonth(reminders, year, month).filter(({ reminder: r, occurrenceDateKey }) => {
    if (isReminderOccurrenceCompleted(r, occurrenceDateKey)) return false
    return fromDateKey(occurrenceDateKey) < today
  }).length
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
      apiFetch(`/org/${org.slug}/reminders`)
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

document.getElementById('snooze-cancel').addEventListener('click', () => closeSnoozeModal(null))
document.getElementById('snooze-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('snooze-date').value
  if (!dateVal) { alert('Informe a data'); return }
  closeSnoozeModal({ type: 'until', until: new Date(dateVal).toISOString() })
})

document.getElementById('pay-cancel').addEventListener('click', () => closePayModal(null))
document.getElementById('pay-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('pay-date').value
  const amount  = parseCurrency(document.getElementById('pay-amount').value)
  if (!dateVal) { alert('Informe a data do pagamento'); return }
  if (!amount || amount <= 0) { alert('Informe o valor pago'); return }
  closePayModal({ paidAt: new Date(dateVal).toISOString(), paidAmount: amount })
})

async function handlePay(txId, liEl, tx) {
  const result = await openPayModal(tx)
  if (!result) return  // cancelled

  const btn = liEl.querySelector('.btn-pay')
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

    liEl.classList.add('paid')
    btn.remove()

    // Determine new amount to display
    const totalAmount = tx.amount
    const wasPartial = tx.status === 'partial'
    const previousPaid = wasPartial && tx.valuePaid != null ? tx.valuePaid / 100 : 0
    const newPaidTotal = previousPaid + result.paidAmount

    // Update in-memory state
    for (const list of [
      state.reports?.overdueTransactions?.transactions,
      state.reports?.upcomingAlerts?.transactions,
      state.reports?.allTransactions,
    ]) {
      const found = (list || []).find(t => t.id === txId)
      if (found) {
        if (Math.abs(newPaidTotal - totalAmount) < 0.01) {
          found.status = 'paid'
        } else {
          found.status = 'partial'
          found.valuePaid = Math.round(newPaidTotal * 100)
        }
      }
    }

    await refreshBadgeAllOrgs()

    // Mirror in "Todas do mês" list
    const twin = document.querySelector(`#list-all [data-id="${txId}"]`)
    if (twin) {
      twin.classList.add('paid')
      const twinBtn = twin.querySelector('.btn-pay')
      if (twinBtn) twinBtn.replaceWith(Object.assign(document.createElement('span'), {
        className: 'badge badge-paid',
        textContent: 'Paga',
      }))
    }
  } catch (err) {
    console.error('[HouseApp] pay error:', err, err.body)
    btn.disabled = false
    const label = tx.status === 'partial' ? 'Pagar resto' : 'Pagar'
    btn.textContent = label
    alert(`Erro ${err.status || ''}: ${err.body || err.message}`)
  }
}

async function loadData() {
  showScreen('loading')
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
    renderOverdue(
      state.reports.overdueTransactions?.transactions,
      state.reports.upcomingAlerts?.transactions,
      context
    )
    renderUpcoming(state.reports.upcomingAlerts?.transactions, context)
    renderAllTransactions(state.reports.allTransactions, context)

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

// ── Boot ──────────────────────────────────────────────────────────────────────
init()
