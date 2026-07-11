import type { WhatsAppAlertBatchItem } from './types'

/** Lighter than org `───────────────`; spans a similar visual width. */
export const WHATSAPP_ITEM_SEPARATOR =
  '· · · · · · · · · · · · · · · · · · · · · · · · · · ·'

export type OrganizationSection = {
  organizationName: string | null
  items: WhatsAppAlertBatchItem[]
}

export function pickOrganizationEmoji(name: string): string {
  const normalized = name.trim().toLowerCase()
  if (normalized.includes('casa')) return '🏠'
  if (normalized.includes('empresa') || normalized.includes('work')) return '🏢'
  return '📁'
}

export function buildOrganizationHeader(name: string): string {
  const trimmed = name.trim()
  return `${pickOrganizationEmoji(trimmed)} *${trimmed}*`
}

/** Groups by org when any item carries organizationName; otherwise one flat section. */
export function partitionItemsByOrganization(
  items: WhatsAppAlertBatchItem[]
): OrganizationSection[] {
  if (!items.some(item => item.organizationName?.trim())) {
    return [{ organizationName: null, items }]
  }

  const order: string[] = []
  const byOrg = new Map<string, WhatsAppAlertBatchItem[]>()

  for (const item of items) {
    const key = item.organizationName?.trim() || 'Outros'
    const list = byOrg.get(key)
    if (list) {
      list.push(item)
      continue
    }
    order.push(key)
    byOrg.set(key, [item])
  }

  return order.map(organizationName => ({
    organizationName,
    items: [...(byOrg.get(organizationName) ?? [])].sort(
      (a, b) => a.daysUntilDue - b.daysUntilDue
    ),
  }))
}
