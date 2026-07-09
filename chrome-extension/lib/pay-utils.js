function maskCurrency(digits) {
  if (!digits) return ''
  const num = parseInt(String(digits).replace(/\D/g, '') || '0', 10)
  return `${Math.floor(num / 100).toLocaleString('pt-BR')},${String(num % 100).padStart(2, '0')}`
}

function parseCurrency(masked) {
  return parseFloat(String(masked).replace(/\./g, '').replace(',', '.')) || 0
}

/** Decimal reais string for API bodies (matches web reaisToMoneyString / parseCentavos). */
function formatPaidAmountReais(reais) {
  return Number(reais).toFixed(2)
}

async function payTransaction(apiUrl, token, orgSlug, transactionId, paidAmountReais, paidAt) {
  const body = { paidAt: paidAt || new Date().toISOString() }
  if (paidAmountReais != null && paidAmountReais > 0) {
    body.paidAmount = formatPaidAmountReais(paidAmountReais)
  }
  const res = await fetch(`${apiUrl}/organizations/${orgSlug}/transactions/${transactionId}/pay`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`pay failed: ${res.status}`)
  return res.status === 204 ? null : res.json()
}

async function dismissNotification(apiUrl, token, notificationId) {
  if (!notificationId) return null
  const res = await fetch(`${apiUrl}/notifications/${notificationId}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  if (!res.ok) throw new Error(`dismiss failed: ${res.status}`)
  return res.json()
}

async function schedulePayment(apiUrl, token, orgSlug, transactionId, scheduledAt) {
  const res = await fetch(
    `${apiUrl}/organizations/${orgSlug}/transactions/${transactionId}/schedule-payment`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduledAt }),
    }
  )
  if (!res.ok) throw new Error(`schedule failed: ${res.status}`)
  return res.json()
}

async function cancelScheduledPayment(apiUrl, token, orgSlug, transactionId) {
  const res = await fetch(
    `${apiUrl}/organizations/${orgSlug}/transactions/${transactionId}/cancel-scheduled-payment`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }
  )
  if (!res.ok) throw new Error(`cancel schedule failed: ${res.status}`)
  return res.json()
}

globalThis.HouseAppPay = {
  maskCurrency,
  parseCurrency,
  formatPaidAmountReais,
  payTransaction,
  dismissNotification,
  schedulePayment,
  cancelScheduledPayment,
}
