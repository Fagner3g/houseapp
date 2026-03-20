const statusEl = document.getElementById('status')

const ENVS = {
  prod: { apiUrl: 'https://api.jarvis.dev.br', webUrl: 'https://app.jarvis.dev.br' },
  dev:  { apiUrl: 'http://localhost:3333',      webUrl: 'http://localhost:5173' },
}

function applyEnv(env) {
  document.getElementById('api-url').value = ENVS[env].apiUrl
  document.getElementById('web-url').value = ENVS[env].webUrl
  document.getElementById('btn-env-prod').classList.toggle('active', env === 'prod')
  document.getElementById('btn-env-dev').classList.toggle('active',  env === 'dev')
}

document.getElementById('btn-env-prod').addEventListener('click', () => applyEnv('prod'))
document.getElementById('btn-env-dev').addEventListener('click',  () => applyEnv('dev'))

function setStatus(msg, type = '') {
  statusEl.textContent = msg
  statusEl.className = type ? `status-${type}` : ''
}

// ── Load saved settings ───────────────────────────────────────────────────────

chrome.storage.local.get(['apiUrl', 'webUrl', 'pollMinutes'], (data) => {
  if (data.apiUrl)     document.getElementById('api-url').value = data.apiUrl
  if (data.webUrl)     document.getElementById('web-url').value = data.webUrl
  if (data.pollMinutes) {
    document.getElementById('poll-minutes').value = String(data.pollMinutes)
  }
  // highlight active env button based on saved apiUrl
  const savedApi = data.apiUrl || ''
  const activeEnv = savedApi.includes('localhost') ? 'dev' : 'prod'
  document.getElementById('btn-env-prod').classList.toggle('active', activeEnv === 'prod')
  document.getElementById('btn-env-dev').classList.toggle('active',  activeEnv === 'dev')
})

// ── Save ──────────────────────────────────────────────────────────────────────

document.getElementById('btn-save').addEventListener('click', async () => {
  const apiUrl     = document.getElementById('api-url').value.trim().replace(/\/$/, '')
  const webUrl     = document.getElementById('web-url').value.trim().replace(/\/$/, '')
  const pollMinutes = Number(document.getElementById('poll-minutes').value)

  if (!apiUrl) { setStatus('Informe a URL da API.', 'err'); return }
  if (!webUrl) { setStatus('Informe a URL do App Web.', 'err'); return }

  await chrome.storage.local.set({ apiUrl, webUrl, pollMinutes })

  // Recreate alarm with new interval
  chrome.alarms.clear('houseapp-poll', () => {
    chrome.alarms.create('houseapp-poll', { periodInMinutes: pollMinutes })
  })

  setStatus('Configurações salvas!', 'ok')
  setTimeout(() => setStatus(''), 3000)
})

// ── Test connection ───────────────────────────────────────────────────────────

document.getElementById('btn-test').addEventListener('click', async () => {
  setStatus('Testando...')

  const apiUrl = document.getElementById('api-url').value.trim().replace(/\/$/, '')
  if (!apiUrl) { setStatus('Informe a URL da API.', 'err'); return }

  // Try to get token from storage or cookie
  const { token, webUrl } = await chrome.storage.local.get(['token', 'webUrl'])
  let tok = token

  if (!tok && webUrl) {
    try {
      const cookie = await chrome.cookies.get({ url: webUrl, name: 'houseapp' })
      tok = cookie?.value || null
    } catch (_) {}
  }

  if (!tok) {
    setStatus('Nenhum token encontrado. Faça login no app primeiro.', 'err')
    return
  }

  try {
    const res = await fetch(`${apiUrl}/profile`, {
      headers: { Authorization: `Bearer ${tok}` },
    })
    if (res.ok) {
      const data = await res.json()
      const name = data.user?.name || data.name || 'usuário'
      setStatus(`Conectado como ${name}`, 'ok')
    } else {
      setStatus(`Erro ${res.status}: token inválido ou expirado.`, 'err')
    }
  } catch (err) {
    setStatus(`Falha na conexão: ${err.message}`, 'err')
  }
})

// ── Logout ────────────────────────────────────────────────────────────────────

document.getElementById('btn-logout').addEventListener('click', async () => {
  await chrome.storage.local.remove(['token', 'cachedReport', 'cachedYear', 'cachedMonth', 'orgSlug'])
  chrome.action.setBadgeText({ text: '' })
  setStatus('Desconectado.', 'ok')
})
