// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function fmt(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount)
  return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function show(id) { document.getElementById(id).classList.remove('hidden') }
function hide(id) { document.getElementById(id).classList.add('hidden') }
function showScreen(name) {
  for (const s of ['login','loading','error','main']) {
    document.getElementById(`screen-${s}`).classList.toggle('hidden', s !== name)
  }
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
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderKpis(reports) {
  const kpis = reports.kpis || {}
  document.getElementById('kpi-income').textContent  = fmt(kpis.toReceiveTotal  ?? 0)
  document.getElementById('kpi-expense').textContent = fmt(kpis.toSpendTotal    ?? 0)
  const balance = (kpis.toReceiveTotal ?? 0) - (kpis.toSpendTotal ?? 0)
  const balEl = document.getElementById('kpi-balance')
  balEl.textContent = fmt(balance)
  balEl.className = `kpi-value balance ${balance >= 0 ? '' : 'expense'}`
}

function renderOverdue(transactions) {
  const list  = document.getElementById('list-overdue')
  const empty = document.getElementById('overdue-empty')
  const title = document.getElementById('overdue-title')

  list.innerHTML = ''
  title.textContent = `Vencidas (${transactions.length})`

  if (!transactions.length) { show('overdue-empty'); return }
  hide('overdue-empty')

  for (const tx of transactions) {
    const li = document.createElement('li')
    li.className = 'tx-item'
    li.dataset.id = tx.id

    const days = tx.overdueDays || 0
    const dayLabel = days === 1 ? '1 dia' : `${days}d`

    li.innerHTML = `
      <span class="tx-title" title="${tx.title}">${tx.title}</span>
      <span class="tx-meta">${dayLabel}</span>
      <span class="tx-amount">${fmt(tx.amount)}</span>
      <button class="btn-pay" data-id="${tx.id}">Pagar</button>
    `

    li.querySelector('.btn-pay').addEventListener('click', (e) => {
      e.stopPropagation()
      handlePay(tx.id, li)
    })

    list.appendChild(li)
  }
}

function renderUpcoming(transactions) {
  const list  = document.getElementById('list-upcoming')
  const title = document.getElementById('upcoming-title')

  list.innerHTML = ''
  title.textContent = `Próximas (${transactions.length})`

  if (!transactions.length) { show('upcoming-empty'); return }
  hide('upcoming-empty')

  for (const tx of transactions) {
    const li = document.createElement('li')
    li.className = 'tx-item'

    const d = tx.daysUntilDue
    const dueLabel = d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `${d} dias`

    li.innerHTML = `
      <span class="tx-title" title="${tx.title}">${tx.title}</span>
      <span class="tx-meta">${dueLabel}</span>
      <span class="tx-amount">${fmt(tx.amount)}</span>
    `
    list.appendChild(li)
  }
}

function renderMonthLabel() {
  document.getElementById('month-label').textContent =
    `${MONTHS[state.month - 1]} de ${state.year}`
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function handlePay(txId, liEl) {
  const btn = liEl.querySelector('.btn-pay')
  btn.disabled = true
  btn.textContent = '...'

  try {
    await apiFetch(`/org/${state.orgSlug}/transaction/${txId}/pay`, { method: 'PATCH' })
    liEl.classList.add('paid')
    btn.remove()
    await chrome.storage.local.remove('cachedReport')
  } catch (err) {
    btn.disabled = false
    btn.textContent = 'Pagar'
    alert('Erro ao marcar como paga. Tente novamente.')
  }
}

async function loadData() {
  showScreen('loading')
  try {
    const data = await apiFetch(
      `/org/${state.orgSlug}/reports/transactions?year=${state.year}&month=${state.month}`
    )
    state.reports = data.reports || data

    renderMonthLabel()
    renderKpis(state.reports)
    renderOverdue(state.reports.overdueTransactions?.transactions || [])
    renderUpcoming(state.reports.upcomingAlerts?.transactions || [])

    // Cache for background worker
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
    // No config yet → open options
    showScreen('login')
    document.getElementById('screen-login').querySelector('p').textContent =
      'Configure a URL da API nas opções.'
    return
  }

  state.token = await resolveToken()
  if (!state.token) { showScreen('login'); return }

  // Validate token
  try {
    await apiFetch('/profile')
  } catch (_) {
    await chrome.storage.local.remove('token')
    showScreen('login')
    return
  }

  // Resolve org slug
  if (stored.orgSlug) {
    state.orgSlug = stored.orgSlug
  } else {
    try {
      const orgsData = await apiFetch('/orgs')
      const orgs = orgsData.organizations || orgsData.orgs || orgsData
      if (!orgs?.length) { showScreen('error'); return }
      state.orgSlug = orgs[0].slug
      await chrome.storage.local.set({ orgSlug: state.orgSlug })
    } catch (_) {
      showScreen('error')
      return
    }
  }

  await loadData()
}

// ── Event listeners ───────────────────────────────────────────────────────────

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

document.getElementById('btn-retry').addEventListener('click', () => {
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
