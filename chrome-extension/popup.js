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
 * A transaction can only be paid in past or current context, and only if pending.
 */
function canPayTransaction(tx, context) {
  if (context === 'future') return false
  return tx.status === 'pending'
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
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function resolveToken() {
  const stored = await chrome.storage.local.get(['token', 'webUrl'])
  if (stored.token) return stored.token

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

  const canPay = canPayTransaction(tx, context)

  let actionHtml = ''
  if (canPay) {
    actionHtml = `<button class="btn-pay" data-id="${tx.id}">Pagar</button>`
  } else if (context === 'future') {
    actionHtml = '<span class="badge badge-future">Prevista</span>'
  } else if (tx.status === 'paid') {
    actionHtml = '<span class="badge badge-paid">Paga</span>'
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
  title.textContent = `Vencidas (${all.length})`

  if (!all.length) { show('overdue-empty'); return }
  hide('overdue-empty')

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

  if (!upcoming.length) { show('upcoming-empty'); return }
  hide('upcoming-empty')

  for (const tx of upcoming) {
    const d = tx.daysUntilDue
    const meta = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `${d} dias`
    list.appendChild(renderTransactionItem(tx, context, meta))
  }
}

function renderAllTransactions(allTransactions, context) {
  const list  = document.getElementById('list-all')
  const title = document.getElementById('all-title')

  list.innerHTML = ''

  const txs = allTransactions || []
  title.textContent = `Todas do mês (${txs.length})`

  if (!txs.length) { show('all-empty'); return }
  hide('all-empty')

  for (const tx of txs) {
    list.appendChild(renderTransactionItem(tx, context, fmtDate(tx.dueDate)))
  }
}

function renderInvestments(reminders) {
  const list = document.getElementById('list-investments')
  const title = document.getElementById('investments-title')

  list.innerHTML = ''
  const items = reminders?.items || []
  title.textContent = `Aportes do mês (${items.length})`

  if (!items.length) {
    show('investments-empty')
    return
  }
  hide('investments-empty')

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

function updateBadge(overdueCount, upcomingCount, investmentCount = 0) {
  const total = overdueCount + upcomingCount + investmentCount
  if (total === 0) { chrome.action.setBadgeText({ text: '' }); return }
  chrome.action.setBadgeText({ text: String(total) })
  chrome.action.setBadgeTextColor({ color: '#ffffff' })
  chrome.action.setBadgeBackgroundColor({ color: overdueCount > 0 ? '#ef4444' : investmentCount > 0 ? '#2563eb' : '#f59e0b' })
}

/**
 * Fetches fresh reports for every org and recalculates the badge.
 * Called once on popup open (after orgs are known) so the badge is always accurate.
 */
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

  let totalOverdue = 0
  let totalUpcoming = 0
  let totalInvestments = 0
  const newCache = {}

  for (const orgData of results.filter(Boolean)) {
    totalOverdue  += (orgData.reports.overdueTransactions?.transactions || []).filter(t => t.status === 'pending').length
    totalUpcoming += (orgData.reports.upcomingAlerts?.transactions      || []).filter(t => t.status === 'pending').length
    newCache[orgData.slug] = orgData.reports
  }

  totalInvestments = state.investments?.summary?.total || state.investments?.items?.length || 0

  updateBadge(totalOverdue, totalUpcoming, totalInvestments)
  await chrome.storage.local.set({
    cachedReportsByOrg: newCache,
    badgeTotals: { overdue: totalOverdue, upcoming: totalUpcoming, investments: totalInvestments },
  })
}

/**
 * Recalculates badge across ALL orgs using the per-org cache.
 * Updates the current org's data before recalculating so the count is fresh.
 */
async function updateBadgeFromReports(reports) {
  const { cachedReportsByOrg } = await chrome.storage.local.get('cachedReportsByOrg')
  const allOrgs = { ...(cachedReportsByOrg || {}), [state.orgSlug]: reports }

  let totalOverdue = 0
  let totalUpcoming = 0
  for (const r of Object.values(allOrgs)) {
    totalOverdue  += (r.overdueTransactions?.transactions || []).filter(t => t.status === 'pending').length
    totalUpcoming += (r.upcomingAlerts?.transactions      || []).filter(t => t.status === 'pending').length
  }

  const totalInvestments = state.investments?.summary?.total ?? state.investments?.items?.length ?? 0

  updateBadge(totalOverdue, totalUpcoming, totalInvestments)
  await chrome.storage.local.set({
    cachedReportsByOrg: allOrgs,
    badgeTotals: { overdue: totalOverdue, upcoming: totalUpcoming, investments: totalInvestments },
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
  // Default date = due date; user can switch to today via button
  const dueDateStr = tx.dueDate ? tx.dueDate.split('T')[0] : new Date().toISOString().split('T')[0]
  document.getElementById('pay-date').value = dueDateStr
  // Pre-fill amount with currency mask
  const centavos = Math.round(tx.amount * 100)
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
    // If amount changed, update the transaction first before marking as paid
    const amountChanged = Math.abs(result.paidAmount - tx.amount) >= 0.01
    if (amountChanged && tx.seriesId) {
      await apiFetch(`/org/${state.orgSlug}/transaction/${txId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          type: tx.type,
          title: tx.title,
          amount: result.paidAmount.toFixed(2),
          serieId: tx.seriesId,
          dueDate: tx.dueDate,
          payToEmail: tx.payToEmail || undefined,
          updateSeries: false,
        }),
      })
    }

    await apiFetch(`/org/${state.orgSlug}/transaction/${txId}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(result),
    })
    liEl.classList.add('paid')
    btn.remove()

    // If amount changed, update the displayed value in this item
    if (amountChanged) {
      const amountEl = liEl.querySelector('.tx-amount')
      if (amountEl) amountEl.textContent = fmt(result.paidAmount)
    }

    // Update this tx as paid in the in-memory state so badge recalc is correct
    for (const list of [
      state.reports?.overdueTransactions?.transactions,
      state.reports?.upcomingAlerts?.transactions,
      state.reports?.allTransactions,
    ]) {
      const found = (list || []).find(t => t.id === txId)
      if (found) found.status = 'paid'
    }

    await updateBadgeFromReports(state.reports)

    // Mirror the paid state (and new amount) in "Todas do mês" if the same tx is there
    const twin = document.querySelector(`#list-all [data-id="${txId}"]`)
    if (twin) {
      twin.classList.add('paid')
      if (amountChanged) {
        const twinAmount = twin.querySelector('.tx-amount')
        if (twinAmount) twinAmount.textContent = fmt(result.paidAmount)
      }
      const twinBtn = twin.querySelector('.btn-pay')
      if (twinBtn) twinBtn.replaceWith(Object.assign(document.createElement('span'), {
        className: 'badge badge-paid',
        textContent: 'Paga',
      }))
    }
  } catch (err) {
    console.error('[HouseApp] pay error:', err, err.body)
    btn.disabled = false
    btn.textContent = 'Pagar'
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

    const context = getViewingContext(state.year, state.month)

    renderMonthLabel()
    renderKpis(state.reports, context)
    renderInvestments(state.investments)
    renderOverdue(
      state.reports.overdueTransactions?.transactions,
      state.reports.upcomingAlerts?.transactions,
      context
    )
    renderUpcoming(state.reports.upcomingAlerts?.transactions, context)
    renderAllTransactions(state.reports.allTransactions, context)

    await updateBadgeFromReports(state.reports)

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
    } else {
      showScreen('error')
    }
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

  // Refresh badge with fresh data from ALL orgs (runs in background after popup renders)
  refreshBadgeAllOrgs().catch(() => {})
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
