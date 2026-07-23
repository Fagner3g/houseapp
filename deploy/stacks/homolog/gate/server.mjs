import http from 'node:http'
import { areAllUp, scaleServices } from './docker.mjs'
import { checkHealth, proxyRequest } from './proxy.mjs'
import { waitingHtml } from './waiting.mjs'

const PORT = Number(process.env.PORT || 8080)
const IDLE_MS = Number(process.env.IDLE_MS || 600_000)
const WAKE_TIMEOUT_MS = Number(process.env.WAKE_TIMEOUT_MS || 90_000)
const WEB_HOST = process.env.WEB_UPSTREAM_HOST || 'tasks.houseapp-homolog_web'
const WEB_PORT = Number(process.env.WEB_UPSTREAM_PORT || 80)
const API_HOST = process.env.API_UPSTREAM_HOST || 'tasks.houseapp-homolog_api'
const API_PORT = Number(process.env.API_UPSTREAM_PORT || 3333)
const WEB_PUBLIC_HOST = process.env.WEB_PUBLIC_HOST || 'app.homolog.jarvis.dev.br'
const API_PUBLIC_HOST = process.env.API_PUBLIC_HOST || 'api.homolog.jarvis.dev.br'

let idleTimer = null
let wakePromise = null

function touchIdle() {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    scaleServices(0)
      .then(() => console.log('[gate] scaled to 0 after idle'))
      .catch((err) => console.error('[gate] scale down failed', err))
  }, IDLE_MS)
}

async function waitUntilHealthy(deadline) {
  while (Date.now() < deadline) {
    const [webOk, apiOk] = await Promise.all([
      checkHealth(`http://${WEB_HOST}:${WEB_PORT}/health`),
      checkHealth(`http://${API_HOST}:${API_PORT}/health`),
    ])
    if (webOk && apiOk) return true
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

async function ensureAwake() {
  if (await areAllUp()) {
    const healthy = await waitUntilHealthy(Date.now() + 5_000)
    if (healthy) return true
  }
  if (!wakePromise) {
    wakePromise = (async () => {
      console.log('[gate] waking homolog api+web')
      await scaleServices(1)
      const ok = await waitUntilHealthy(Date.now() + WAKE_TIMEOUT_MS)
      if (!ok) throw new Error('Homolog did not become healthy in time')
      console.log('[gate] homolog is healthy')
      return true
    })().finally(() => {
      wakePromise = null
    })
  }
  return wakePromise
}

function resolveUpstream(hostHeader) {
  const host = (hostHeader || '').split(':')[0].toLowerCase()
  if (host === API_PUBLIC_HOST) {
    return { kind: 'api', hostname: API_HOST, port: API_PORT }
  }
  if (host === WEB_PUBLIC_HOST) {
    return { kind: 'web', hostname: WEB_HOST, port: WEB_PORT }
  }
  return null
}

function sendWaiting(res, kind) {
  const name = kind === 'api' ? 'API de homologação' : 'app de homologação'
  res.writeHead(503, {
    'content-type': 'text/html; charset=utf-8',
    'retry-after': '3',
    'cache-control': 'no-store',
  })
  res.end(waitingHtml({ displayName: name }))
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
    return
  }

  const upstream = resolveUpstream(req.headers.host)
  if (!upstream) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Unknown host')
    return
  }

  touchIdle()

  try {
    if (wakePromise) {
      sendWaiting(res, upstream.kind)
      return
    }

    if (!(await areAllUp())) {
      ensureAwake().catch((err) => console.error('[gate] wake failed', err))
      sendWaiting(res, upstream.kind)
      return
    }

    const healthy = await waitUntilHealthy(Date.now() + 3_000)
    if (!healthy) {
      ensureAwake().catch((err) => console.error('[gate] wake failed', err))
      sendWaiting(res, upstream.kind)
      return
    }

    proxyRequest(req, res, upstream)
  } catch (err) {
    console.error('[gate] request error', err)
    if (!res.headersSent) {
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(`Homolog unavailable: ${err.message}`)
    }
  }
})

server.listen(PORT, () => {
  console.log(`[gate] listening on :${PORT} idle=${IDLE_MS}ms`)
})
