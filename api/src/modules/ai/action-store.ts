import { createId } from '@/core/ids'

export type AiActionName =
  | 'create_transaction'
  | 'import_statement'
  | 'pay_transaction'
  | 'create_split'
  | 'register_split_payment'

export type PendingAction = {
  id: string
  userId: string
  orgId: string
  action: AiActionName
  data: unknown
  createdAt: number
}

const TTL_MS = 5 * 60 * 1000
const store = new Map<string, PendingAction>()

function purgeExpired(): void {
  const now = Date.now()

  for (const [id, action] of store) {
    if (now - action.createdAt > TTL_MS) {
      store.delete(id)
    }
  }
}

export function storeAction(
  userId: string,
  orgId: string,
  action: AiActionName,
  data: unknown
): PendingAction {
  purgeExpired()

  const pending: PendingAction = {
    id: createId(),
    userId,
    orgId,
    action,
    data,
    createdAt: Date.now(),
  }

  store.set(pending.id, pending)
  return pending
}

export function getAction(actionId: string): PendingAction | null {
  purgeExpired()
  return store.get(actionId) ?? null
}

export function removeAction(actionId: string): boolean {
  return store.delete(actionId)
}
