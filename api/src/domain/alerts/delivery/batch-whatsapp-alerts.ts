import { alertDeliveries, type AlertDeliveryStatus } from '@/db/schemas/alertDeliveries'
import { sendWhatsAppMessage, normalizePhone } from '@/domain/whatsapp'
import { composeWhatsAppAlertMessage } from '../utils'
import { insertAlertDelivery } from './insert-alert-delivery'

export type DeferredWhatsAppDelivery = {
  phone: string
  organizationId: string
  orgName: string
  isOrgOwner: boolean
  recipientName: string | null
  body: string
  delivery: Omit<typeof alertDeliveries.$inferInsert, 'status' | 'sentAt'>
}

function groupKey(item: DeferredWhatsAppDelivery): string {
  return `${item.delivery.userId}:${item.organizationId}`
}

export async function flushWhatsAppAlertQueue(queue: DeferredWhatsAppDelivery[]) {
  if (queue.length === 0) {
    return { processed: 0, errors: 0 }
  }

  const groups = new Map<string, DeferredWhatsAppDelivery[]>()
  for (const item of queue) {
    const key = groupKey(item)
    const existing = groups.get(key) ?? []
    existing.push(item)
    groups.set(key, existing)
  }

  let processed = 0
  let errors = 0

  for (const group of groups.values()) {
    const head = group[0]
    const phone = normalizePhone(head.phone)
    if (!phone) {
      errors += group.length
      continue
    }

    const message = composeWhatsAppAlertMessage({
      recipientName: head.recipientName,
      orgName: head.orgName,
      isOrgOwner: head.isOrgOwner,
      bodies: group.map(item => item.body),
    })

    const result = await sendWhatsAppMessage({ phone, message })
    const status: AlertDeliveryStatus = result.status === 'sent' ? 'sent' : 'failed'
    const sentAt = status === 'sent' ? new Date() : null

    for (const item of group) {
      const delivery = await insertAlertDelivery({
        ...item.delivery,
        status,
        sentAt,
      })
      if (delivery) {
        processed++
        if (status === 'failed') errors++
      }
    }
  }

  return { processed, errors }
}
