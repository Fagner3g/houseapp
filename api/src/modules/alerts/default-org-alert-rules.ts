import { eq } from 'drizzle-orm'

import { db } from '@/db'
import type { AlertRuleChannel } from '@/db/schemas/alertRules'
import { organizations } from '@/db/schemas/organizations'

import { DrizzleAlertRuleRepository } from './alert-rule.repository'

const UPCOMING_DAYS = [1, 3, 7]
const UPCOMING_CHANNELS: AlertRuleChannel[] = ['in_app', 'extension']
const OVERDUE_CHANNELS: AlertRuleChannel[] = ['in_app', 'whatsapp', 'extension']

const repository = new DrizzleAlertRuleRepository()

async function resolveCreatedBy(organizationId: string, createdBy?: string): Promise<string | null> {
  if (createdBy) return createdBy

  const [organization] = await db
    .select({ ownerId: organizations.ownerId })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)

  return organization?.ownerId ?? null
}

export async function ensureDefaultOrgAlertRules(
  organizationId: string,
  createdBy?: string
): Promise<void> {
  const userId = await resolveCreatedBy(organizationId, createdBy)
  if (!userId) return

  const upcoming = await repository.findActiveByScope(organizationId, 'organization', 'upcoming')
  if (!upcoming) {
    await repository.create({
      organizationId,
      scope: 'organization',
      triggerType: 'upcoming',
      config: { daysBefore: UPCOMING_DAYS },
      channels: UPCOMING_CHANNELS,
      createdBy: userId,
    })
  }

  const overdue = await repository.findActiveByScope(organizationId, 'organization', 'overdue')
  if (!overdue) {
    await repository.create({
      organizationId,
      scope: 'organization',
      triggerType: 'overdue',
      config: { frequency: 'daily', interval: 1 },
      channels: OVERDUE_CHANNELS,
      createdBy: userId,
    })
  }
}
