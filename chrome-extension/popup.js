const notify = globalThis.HouseAppNotify
const alertItems = globalThis.HouseAppAlertItems
const payUtil = globalThis.HouseAppPay

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
  orgId: '',
  token: '',
  orgs: [],
  allItems: [],
  filter: 'all',
  kpiFilter: null,
  lastUpdated: null,
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

function getVisibleItems() {
  let items = state.allItems
  const activeFilter = state.kpiFilter || state.filter
  if (activeFilter === 'overdue') items = items.filter(i => i.kind === 'overdue')
  if (activeFilter === 'scheduled') items = items.filter(i => i.kind === 'scheduled')
  if (activeFilter === 'upcoming') items = items.filter(i => i.kind === 'upcoming')
  return items.slice(0, 10)
}

function renderKpis() {
  const counts = notify.countByKind(state.allItems)
  document.getElementById('count-overdue').textContent = String(counts.overdue)
  document.getElementById('count-scheduled').textContent = String(counts.scheduled)
  document.getElementById('count-upcoming').textContent = String(counts.upcoming)
  document.getElementById('pill-overdue').classList.toggle('active', state.kpiFilter === 'overdue')
  document.getElementById('pill-scheduled').classList.toggle('active', state.kpiFilter === 'scheduled')
  document.getElementById('pill-upcoming').classList.toggle('active', state.kpiFilter === 'upcoming')
}

function renderTabs() {
  const active = state.kpiFilter || state.filter
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === active)
  })
}

function emptyMessage() {
  const active = state.kpiFilter || state.filter
  if (state.allItems.length === 0) return 'Nenhuma conta vencida, agendada ou próxima no momento.'
  if (active === 'overdue') return 'Nenhuma conta vencida.'
  if (active === 'scheduled') return 'Nenhuma conta agendada.'
  if (active === 'upcoming') return 'Nenhuma conta próxima.'
  return 'Nenhuma conta vencida, agendada ou próxima.'
}

function renderList() {
  const list = document.getElementById('list-actions')
  const empty = document.getElementById('list-empty')
  list.innerHTML = ''
  const items = getVisibleItems()

  if (!items.length) {
    empty.textContent = emptyMessage()
    empty.classList.remove('hidden')
    return
  }
  empty.classList.add('hidden')

  const showOrg = state.orgs.length > 1
  for (const item of items) {
    const li = document.createElement('li')
    li.className = `alert-card ${item.kind}`
    const amountClass = item.hasAmount ? '' : ' unknown'
    const amountText = notify.formatAmount(item.amountReais, item.hasAmount)
    const isScheduled = item.kind === 'scheduled'
    const badges = notify.getStatusBadges(item)
    const badgesHtml = badges
      .map(
        badge =>
          `<span class="badge ${badge.badgeClass}">${escapeHtml(badge.label)}</span>`
      )
      .join('')
    li.innerHTML = `
      ${showOrg && item.orgName ? `<div class="card-org">${escapeHtml(item.orgName)}</div>` : ''}
      <div class="card-top">
        <span class="card-title">${escapeHtml(item.title)}</span>
        <span class="card-amount${amountClass}">${escapeHtml(amountText)}</span>
      </div>
      <div class="card-meta">${badgesHtml}</div>
      <div class="card-actions">
        ${item.transactionId ? '<button class="btn-pay" type="button">Pagar</button>' : ''}
        ${item.transactionId && isScheduled ? '<button class="btn-cancel-schedule" type="button">Cancelar agendamento</button>' : ''}
        ${item.transactionId && !isScheduled ? '<button class="btn-schedule" type="button">Agendar</button>' : ''}
        ${item.notificationId ? '<button class="btn-dismiss" type="button">Dispensar</button>' : ''}
        <button class="btn-icon" type="button" title="Ver no web">↗</button>
      </div>
    `

    li.querySelector('.btn-pay')?.addEventListener('click', e => {
      e.stopPropagation()
      handlePay(item, li)
    })
    li.querySelector('.btn-schedule')?.addEventListener('click', e => {
      e.stopPropagation()
      handleSchedule(item, li)
    })
    li.querySelector('.btn-cancel-schedule')?.addEventListener('click', e => {
      e.stopPropagation()
      handleCancelSchedule(item, li)
    })
    li.querySelector('.btn-dismiss')?.addEventListener('click', e => {
      e.stopPropagation()
      handleDismiss(item.notificationId, li)
    })
    li.querySelector('.btn-icon')?.addEventListener('click', () => openInWeb(item.orgSlug, item.transactionId))

    list.appendChild(li)
  }
}

function renderFooter() {
  const el = document.getElementById('last-updated')
  el.textContent = state.lastUpdated
    ? `Atualizado ${notify.formatRelativeTime(state.lastUpdated)}`
    : ''
}

function renderAll() {
  renderKpis()
  renderTabs()
  renderList()
  renderFooter()
}

function openInWeb(orgSlug, transactionId) {
  chrome.storage.local.get('webUrl').then(({ webUrl }) => {
    const base = webUrl || 'https://houseapp.com.br'
    const slug = orgSlug || state.orgSlug
    const url = transactionId
      ? `${base}/${slug}/transactions?tx=${transactionId}`
      : `${base}/${slug}`
    chrome.tabs.create({ url })
  })
}

let _payResolve = null

function toLocalDateInputValue(iso) {
  if (!iso) return todayLocalDateInputValue()
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return todayLocalDateInputValue()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function todayLocalDateInputValue() {
  return toLocalDateInputValue(new Date().toISOString())
}

function openPayModal(item) {
  document.getElementById('pay-modal-title').textContent = item.title
  document.getElementById('pay-modal-hint').textContent = item.hasAmount
    ? `Valor pendente: ${notify.formatAmount(item.amountReais, true)}`
    : 'Informe o valor pago.'
  const payDateEl = document.getElementById('pay-date')
  const dueDate = toLocalDateInputValue(item.date)
  payDateEl.value = dueDate
  payDateEl.dataset.dueDate = dueDate
  document.getElementById('pay-amount').value = item.hasAmount
    ? payUtil.maskCurrency(String(item.amountCents))
    : ''
  document.getElementById('pay-error').classList.add('hidden')
  document.getElementById('pay-amount').classList.remove('input-error')
  document.getElementById('pay-modal').classList.remove('hidden')
  return new Promise(resolve => { _payResolve = resolve })
}

function closePayModal(result) {
  document.getElementById('pay-modal').classList.add('hidden')
  if (_payResolve) { _payResolve(result); _payResolve = null }
}

function toDateInputValue(iso) {
  return toLocalDateInputValue(iso)
}

let _scheduleResolve = null

function openScheduleModal(item) {
  document.getElementById('schedule-modal-title').textContent = item.title
  const today = todayLocalDateInputValue()
  const dueDate = toDateInputValue(item.date)
  const initialDate = dueDate >= today ? dueDate : today
  const scheduleDateEl = document.getElementById('schedule-date')
  scheduleDateEl.min = today
  scheduleDateEl.value = initialDate
  scheduleDateEl.dataset.dueDate = dueDate
  const dueBtn = document.getElementById('schedule-due')
  if (dueDate < today) {
    dueBtn.disabled = true
    dueBtn.classList.add('hidden')
  } else {
    dueBtn.disabled = false
    dueBtn.classList.remove('hidden')
  }
  document.getElementById('schedule-error').classList.add('hidden')
  document.getElementById('schedule-modal').classList.remove('hidden')
  return new Promise(resolve => { _scheduleResolve = resolve })
}

function closeScheduleModal(result) {
  document.getElementById('schedule-modal').classList.add('hidden')
  if (_scheduleResolve) { _scheduleResolve(result); _scheduleResolve = null }
}

async function handleSchedule(item, liEl) {
  const dateVal = await openScheduleModal(item)
  if (!dateVal) return
  const btn = liEl.querySelector('.btn-schedule')
  if (btn) { btn.disabled = true; btn.textContent = '...' }
  try {
    await payUtil.schedulePayment(
      state.apiUrl,
      state.token,
      item.orgSlug,
      item.transactionId,
      new Date(dateVal).toISOString()
    )
    await loadData({ silent: true })
    chrome.runtime.sendMessage({ type: 'poll-now' }).catch(() => {})
  } catch (err) {
    console.error('[HouseApp] schedule error:', err)
    if (btn) { btn.disabled = false; btn.textContent = 'Agendar' }
  }
}

async function handlePay(item, liEl) {
  const result = await openPayModal(item)
  if (!result) return
  const btn = liEl.querySelector('.btn-pay')
  if (btn) { btn.disabled = true; btn.textContent = '...' }
  try {
    await payUtil.payTransaction(
      state.apiUrl,
      state.token,
      item.orgSlug,
      item.transactionId,
      result.paidAmount,
      result.paidAt
    )
    if (item.notificationId) {
      try {
        await payUtil.dismissNotification(state.apiUrl, state.token, item.notificationId)
      } catch (dismissErr) {
        console.error('[HouseApp] dismiss after pay error:', dismissErr)
      }
    }
    await loadData({ silent: true })
    chrome.runtime.sendMessage({ type: 'data-updated' })
  } catch (err) {
    console.error('[HouseApp] pay error:', err)
    alert('Não foi possível registrar o pagamento. Verifique o valor e tente novamente.')
    if (btn) { btn.disabled = false; btn.textContent = 'Pagar' }
  }
}

async function handleDismiss(notificationId, liEl) {
  const btn = liEl.querySelector('.btn-dismiss')
  if (btn) btn.disabled = true
  try {
    await payUtil.dismissNotification(state.apiUrl, state.token, notificationId)
    await loadData({ silent: true })
  } catch (err) {
    console.error('[HouseApp] dismiss error:', err)
    if (btn) btn.disabled = false
  }
}

async function handleCancelSchedule(item, liEl) {
  const btn = liEl.querySelector('.btn-cancel-schedule')
  if (btn) { btn.disabled = true; btn.textContent = '...' }
  try {
    await payUtil.cancelScheduledPayment(
      state.apiUrl,
      state.token,
      item.orgSlug,
      item.transactionId
    )
    await loadData({ silent: true })
    chrome.runtime.sendMessage({ type: 'poll-now' }).catch(() => {})
  } catch (err) {
    console.error('[HouseApp] cancel schedule error:', err)
    if (btn) { btn.disabled = false; btn.textContent = 'Cancelar agendamento' }
  }
}

async function fetchOrgAlerts(orgSlug) {
  const { upcomingPeriod } = await chrome.storage.local.get('upcomingPeriod')
  const dateTo = alertItems.yesterdayEndIso()
  const overdueParams = new URLSearchParams({
    status: 'pending',
    dateTo,
    payableOnly: 'true',
    perPage: '100',
  })
  const upcomingParams = alertItems.buildUpcomingParams(upcomingPeriod)
  const scheduledParams = new URLSearchParams({
    status: 'pending',
    payableOnly: 'true',
    scheduledOnly: 'true',
    perPage: '100',
  })
  const [pendingRes, overdueRes, upcomingRes, scheduledRes] = await Promise.all([
    apiFetch('/notifications/pending'),
    apiFetch(`/organizations/${orgSlug}/transactions?${overdueParams}`),
    apiFetch(`/organizations/${orgSlug}/transactions?${upcomingParams}`),
    apiFetch(`/organizations/${orgSlug}/transactions?${scheduledParams}`),
  ])
  const overdueTransactions = overdueRes?.transactions || []
  const upcomingTransactions = upcomingRes?.transactions || []
  const scheduledTransactions = scheduledRes?.transactions || []
  const transactionIds = [
    ...new Set(
      [...overdueTransactions, ...upcomingTransactions, ...scheduledTransactions].map(tx => tx.id)
    ),
  ]
  const splitPaidRes = transactionIds.length
    ? await apiFetch(`/organizations/${orgSlug}/splits/transaction-ids`, {
        method: 'POST',
        body: JSON.stringify({ transactionIds }),
      })
    : null
  return {
    pendingRes,
    overdueTransactions,
    upcomingTransactions,
    scheduledTransactions,
    splitPaidById: alertItems.indexSplitPaidTotals(splitPaidRes?.splitPaidTotals || []),
  }
}

async function loadData({ silent = false } = {}) {
  const refreshBtn = document.getElementById('btn-refresh')
  if (!silent) showScreen('loading')
  else refreshBtn?.classList.add('spinning')

  try {
    const {
      pendingRes,
      overdueTransactions,
      upcomingTransactions,
      scheduledTransactions,
      splitPaidById,
    } = await fetchOrgAlerts(state.orgSlug)
    const org = state.orgs.find(o => o.slug === state.orgSlug)
    state.orgId = org?.id || ''
    state.allItems = alertItems.buildOrgAlertItems({
      overdueTransactions,
      upcomingTransactions,
      scheduledTransactions,
      notifications: pendingRes?.notifications || [],
      orgs: state.orgs,
      orgId: state.orgId,
      splitPaidById,
    })
    state.lastUpdated = new Date().toISOString()
    renderAll()
    showScreen('main')
  } catch (err) {
    if (err.status === 401) {
      await chrome.storage.local.remove('token')
      showScreen('login')
      return
    }
    showScreen('error')
  } finally {
    refreshBtn?.classList.remove('spinning')
  }
}

async function init() {
  showScreen('loading')
  const stored = await chrome.storage.local.get(['apiUrl', 'webUrl', 'orgSlug'])
  state.apiUrl = stored.apiUrl || ''
  state.webUrl = stored.webUrl || ''
  if (!state.apiUrl) { showScreen('login'); return }

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
  chrome.runtime.sendMessage({ type: 'poll-now' }).catch(() => {})
}

document.getElementById('pay-amount').addEventListener('input', e => {
  e.target.value = payUtil.maskCurrency(e.target.value.replace(/\D/g, ''))
})
document.getElementById('pay-today').addEventListener('click', () => {
  document.getElementById('pay-date').value = todayLocalDateInputValue()
})
document.getElementById('pay-cancel').addEventListener('click', () => closePayModal(null))
document.getElementById('pay-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('pay-date').value
  const amount = payUtil.parseCurrency(document.getElementById('pay-amount').value)
  const errEl = document.getElementById('pay-error')
  const amountEl = document.getElementById('pay-amount')
  if (!dateVal) {
    errEl.textContent = 'Informe a data do pagamento.'
    errEl.classList.remove('hidden')
    return
  }
  if (amount <= 0) {
    errEl.textContent = 'Informe um valor válido.'
    errEl.classList.remove('hidden')
    amountEl.classList.add('input-error')
    return
  }
  errEl.classList.add('hidden')
  amountEl.classList.remove('input-error')
  closePayModal({ paidAt: new Date(dateVal).toISOString(), paidAmount: amount })
})

document.getElementById('schedule-cancel').addEventListener('click', () => closeScheduleModal(null))
document.getElementById('schedule-due').addEventListener('click', () => {
  const due = document.getElementById('schedule-date').dataset.dueDate
  if (due) document.getElementById('schedule-date').value = due
})
document.getElementById('schedule-confirm').addEventListener('click', () => {
  const dateVal = document.getElementById('schedule-date').value
  const errEl = document.getElementById('schedule-error')
  const today = todayLocalDateInputValue()
  if (!dateVal) {
    errEl.textContent = 'Informe a data do débito.'
    errEl.classList.remove('hidden')
    return
  }
  if (dateVal < today) {
    errEl.textContent = 'A data do débito deve ser hoje ou futura.'
    errEl.classList.remove('hidden')
    return
  }
  errEl.classList.add('hidden')
  closeScheduleModal(dateVal)
})

document.getElementById('btn-refresh').addEventListener('click', async () => {
  await loadData({ silent: true })
  chrome.runtime.sendMessage({ type: 'poll-now' }).catch(() => {})
})
document.getElementById('btn-options').addEventListener('click', () => chrome.runtime.openOptionsPage())
document.getElementById('btn-open-web').addEventListener('click', () => openInWeb(state.orgSlug))
document.getElementById('btn-footer-web').addEventListener('click', () => openInWeb(state.orgSlug))
document.getElementById('btn-login').addEventListener('click', () => openInWeb(state.orgSlug))
document.getElementById('btn-retry').addEventListener('click', () => loadData())

document.getElementById('pill-overdue').addEventListener('click', () => {
  state.kpiFilter = state.kpiFilter === 'overdue' ? null : 'overdue'
  if (state.kpiFilter) state.filter = 'all'
  renderAll()
})
document.getElementById('pill-scheduled').addEventListener('click', () => {
  state.kpiFilter = state.kpiFilter === 'scheduled' ? null : 'scheduled'
  if (state.kpiFilter) state.filter = 'all'
  renderAll()
})
document.getElementById('pill-upcoming').addEventListener('click', () => {
  state.kpiFilter = state.kpiFilter === 'upcoming' ? null : 'upcoming'
  if (state.kpiFilter) state.filter = 'all'
  renderAll()
})

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    state.filter = tab.dataset.filter
    state.kpiFilter = null
    renderAll()
  })
})

document.getElementById('org-select').addEventListener('change', async e => {
  state.orgSlug = e.target.value
  state.kpiFilter = null
  await chrome.storage.local.set({ orgSlug: state.orgSlug })
  loadData({ silent: true })
})

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === 'data-updated') loadData({ silent: true })
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.upcomingPeriod) {
    loadData({ silent: true })
  }
})

init()
