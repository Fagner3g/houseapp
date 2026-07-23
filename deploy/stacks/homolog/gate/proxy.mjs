import http from 'node:http'

export function proxyRequest(req, res, { hostname, port }) {
  const headers = { ...req.headers }

  const upstream = http.request(
    {
      hostname,
      port,
      path: req.url,
      method: req.method,
      headers,
      timeout: 60_000,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers)
      upRes.pipe(res)
    },
  )

  upstream.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
      res.end(`Upstream error: ${err.message}`)
    } else {
      res.destroy(err)
    }
  })

  upstream.on('timeout', () => {
    upstream.destroy(new Error('Upstream timeout'))
  })

  req.pipe(upstream)
}

export async function checkHealth(url, timeoutMs = 2000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
