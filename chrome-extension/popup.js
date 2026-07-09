// Simplified HouseApp extension popup — pending/overdue actions only

function fmt(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount || '0')
  return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function fmtDate(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function showScreen(name) {
  for (const s of ['login', 'loading', 'error', 'main']) {
    document.getElementById(`screen-${s}`).classList.toggle('hidden', s !== name)
  }
}

const state = {
  apiUrl: '',
  webUrl: '',
  orgSlug: '',
  token: '',
  orgs: [],
  summary: null,
  items: [],
}

async function resolveToken() {
  const stored = await chrome.storage.local.get(['token', 'webUrl'])
  if (stored.token) {
    try {
      await apiFetchWithToken(stored.token, '/profile')
      return stored.token
    } catch (e) {
      if (e.status !== 401) throw e
      await chrome.storage.local.remove('token')
    }
  }
  if (stored.webUrl) {
    const cookie = await chrome.cookies.get({ url: stored.webUrl, name: 'houseapp' })
    if (cookie?.value) {
      await chrome.storage.local.set({ token: cookie.value })
      return cookie.value
    }
  }
  return null
}

async function apiFetchWithToken(token, path, opts = {}) {
  const res = await fetch(`${state.apiUrl}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  if (res.status === 401) throw Object.assign(new Error('unauthorized'), { status: 401 })
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status })
  if (res.status === 204) return null
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : null
}

async function apiFetch(path, opts = {}) {
  return apiFetchWithToken(state.token, path, opts)
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

function renderSummary() {
  const el = document.getElementById('summary-badge')
  const overdue = state.summary?.overdueCount ?? 0
  const upcoming = state.summary?.upcoming?.length ?? 0
  el.textContent = `${overdue} vencida${overdue === 1 ? '' : 's'}, ${upcoming} próxima${upcoming === 1 ? '' : 's'}`
}

function renderList() {
  const list = document.getElementById('list-actions')
  const empty = document.getElementById('list-empty')
  list.innerHTML = ''

  const items = state.items.slice(0, 10)
  if (!items.length) {
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')

  for (const item of items) {
    const li = document.createElement('li')
    li.className = 'tx-item tx-item-stacked'
    const badge = item.kind === 'overdue' ? 'Vencida' : 'Próxima'
    li.innerHTML = `
      <div class="tx-row tx-row-top">
        <span class="tx-title">${escapeHtml(item.title)}</span>
        <span class="tx-amount">${fmt((Number(item.amount || 0)) / 100)}</span>
      </div>
      <div class="tx-row tx-row-bottom">
        <span class="badge ${item.kind === 'overdue' ? 'badge-overdue' : 'badge-reminder'}">${badge} · ${fmtDate(item.date)}</span>
        <div class="tx-item-actions">
          ${item.transactionId ? `<button class="btn-pay" data-id="${item.transactionId}">Pagar</button>` : ''}
          <button class="btn-snooze" data-id="${item.notificationId}">Snooze</button>
          <button class="btn-web" data-id="${item.transactionId || ''}">Ver no web</button>
        </div>
      </div>
    `

    li.querySelector('.btn-pay')?.addEventListener('click', e => {
      e.stopPropagation()
      handlePay(item.transactionId, li, item)
    })
    li.querySelector('.btn-snooze')?.addEventListener('click', e => {
      e.stopPropagation()
      handleSnooze(item.notificationId, li)
    })
    li.querySelector('.btn-web')?.addEventListener('click', () => openInWeb(item.transactionId))

    list.appendChild(li)
  }
}

function openInWeb(transactionId) {
  chrome.storage.local.get('webUrl').then(({ webUrl }) => {
    const base = webUrl || 'https://houseapp.com.br'
    const url = transactionId
      ? `${base}/${state.orgSlug}/transactions?tx=${transactionId}`
      : `${base}/${state.orgSlug}`
    chrome.tabs.create({ url })
  })
}

function maskCurrency(digits) {
  if (!digits) return ''
  const num = parseInt(String(digits).replace(/\D/g, '') || '0', 10)
  return `${Math.floor(num / 100).toLocaleString('pt-BR')},${String(num % 100).padStart(2, '0')}`
}

function parseCurrency(masked) {
  return parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0
}

let _payResolve = null

function openPayModal(item) {
  document.getElementById('pay-date').value = new Date().toISOString().split('T')[0]
  const cents = Number(item.amount || 0)
  document.getElementById('pay-amount').value = maskCurrency(String(cents))
  document.getElementById('pay-modal').classList.remove('hidden')
  return new Promise(resolve => { _payResolve = resolve })
}

function closePayModal(result) {
  document.getElementById('pay-modal').classList.add('hidden')
  if (_payResolve) { _payResolve(result); _payResolve = null }
}

document.getElementById('pay-amount').addEventListener('input', e => {
  e.target.value = maskCurrency(e.target.value.replace(/\D/g, ''))
})
document.getElementById('pay-cancel').addEventListener('click', () => closePayModal(null))
document.getElementById('pay-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('pay-date').value
  const amount = parseCurrency(document.getElementById('pay-amount').value)
  if (!dateVal || amount <= 0) return
  closePayModal({ paidAt: new Date(dateVal).toISOString(), paidAmount: amount.toFixed(2) })
})

async function handlePay(txId, liEl, item) {
  const result = await openPayModal(item)
  if (!result) return
  const btn = liEl.querySelector('.btn-pay')
  if (btn) { btn.disabled = true; btn.textContent = '...' }
  try {
    const cents = Math.round(result.paidAmount * 100)
    await apiFetch(`/organizations/${state.orgSlug}/transactions/${txId}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paidAt: result.paidAt, paidAmount: String(cents) }),
    })
    await loadData({ silent: true })
    chrome.runtime.sendMessage({ type: 'data-updated' })
  } catch (err) {
    console.error('[HouseApp] pay error:', err)
    if (btn) { btn.disabled = false; btn.textContent = 'Pagar' }
  }
}

async function handleSnooze(notificationId, liEl) {
  const btn = liEl.querySelector('.btn-snooze')
  if (btn) btn.disabled = true
  try {
    await apiFetch(`/notifications/${notificationId}/read`, { method: 'PATCH' })
    await loadData({ silent: true })
  } catch (err) {
    console.error('[HouseApp] snooze error:', err)
    if (btn) btn.disabled = false
  }
}

async function loadData({ silent = false } = {}) {
  if (!silent) showScreen('loading')
  try {
    const [summaryRes, pendingRes] = await Promise.all([
      apiFetch(`/organizations/${state.orgSlug}/reports/summary`),
      apiFetch('/notifications/pending'),
    ])

    state.summary = summaryRes
    const notifications = pendingRes?.notifications || []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    state.items = notifications
      .filter(n => n.transactionId)
      .map(n => {
        const date = n.metadata?.dueDate || n.metadata?.date || n.createdAt
        const due = new Date(date)
        due.setHours(0, 0, 0, 0)
        return {
          notificationId: n.id,
          transactionId: n.transactionId,
          title: n.title,
          amount: n.metadata?.amount || n.metadata?.amountCents || '0',
          date,
          kind: due < today ? 'overdue' : 'upcoming',
        }
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    renderSummary()
    renderList()
    showScreen('main')
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      showScreen('login')
      return
    }
    showScreen('error')
  }
}

async function init() {
  showScreen('loading')
  const stored = await chrome.storage.local.get(['apiUrl', 'webUrl', 'orgSlug'])
  state.apiUrl = stored.apiUrl || ''
  state.webUrl = stored.webUrl || ''
  if (!state.apiUrl) {
    showScreen('login')
    return
  }

  state.token = await resolveToken()
  if (!state.token) { showScreen('login'); return }

  const orgsData = await apiFetch('/orgs')
  const orgs = orgsData.organizations || orgsData.orgs || orgsData
  if (!orgs?.length) { showScreen('error'); return }
  state.orgs = orgs
  state.orgSlug = orgs.find(o => o.slug === stored.orgSlug)?.slug || orgs[0].slug
  await chrome.storage.local.set({ orgSlug: state.orgSlug })
  renderOrgSelect()
  await loadData()
}

document.getElementById('btn-refresh').addEventListener('click', () => loadData())
document.getElementById('btn-options').addEventListener('click', () => chrome.runtime.openOptionsPage())
document.getElementById('btn-open-web').addEventListener('click', () => openInWeb())
document.getElementById('btn-login').addEventListener('click', () => openInWeb())
document.getElementById('btn-retry').addEventListener('click', () => loadData())
document.getElementById('org-select').addEventListener('change', async e => {
  state.orgSlug = e.target.value
  await chrome.storage.local.set({ orgSlug: state.orgSlug })
  loadData()
})

init()
