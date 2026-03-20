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

// ── Pay modal ─────────────────────────────────────────────────────────────────

let _payResolve = null

function openPayModal(tx) {
  // Pre-fill defaults
  const todayStr = new Date().toISOString().split('T')[0]
  document.getElementById('pay-date').value = todayStr
  document.getElementById('pay-amount').value = tx.amount.toFixed(2).replace('.', ',')
  document.getElementById('pay-modal').classList.remove('hidden')

  return new Promise(resolve => { _payResolve = resolve })
}

function closePayModal(result) {
  document.getElementById('pay-modal').classList.add('hidden')
  if (_payResolve) { _payResolve(result); _payResolve = null }
}

document.getElementById('pay-cancel').addEventListener('click', () => closePayModal(null))
document.getElementById('pay-confirm').addEventListener('click', () => {
  const dateVal   = document.getElementById('pay-date').value
  const amountVal = document.getElementById('pay-amount').value.replace(',', '.')
  const amount    = parseFloat(amountVal)
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
    await apiFetch(`/org/${state.orgSlug}/transaction/${txId}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(result),
    })
    liEl.classList.add('paid')
    btn.remove()
    await chrome.storage.local.remove('cachedReport')

    // Mirror the paid state in "Todas do mês" if the same tx is there
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

    const context = getViewingContext(state.year, state.month)

    renderMonthLabel()
    renderKpis(state.reports, context)
    renderOverdue(
      state.reports.overdueTransactions?.transactions,
      state.reports.upcomingAlerts?.transactions,
      context
    )
    renderUpcoming(state.reports.upcomingAlerts?.transactions, context)
    renderAllTransactions(state.reports.allTransactions, context)

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
