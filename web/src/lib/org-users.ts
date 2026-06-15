import type { ListUsersByOrg200UsersItem } from '@/api/generated/model'

type OrgUser = Pick<ListUsersByOrg200UsersItem, 'id' | 'name' | 'email' | 'notificationsEnabled'>

export function getSelectableOrgUsers<T extends OrgUser>(
  users: T[],
  options?: { keepUserIds?: Array<string | null | undefined> }
): T[] {
  const keep = new Set((options?.keepUserIds ?? []).filter((id): id is string => Boolean(id)))
  return users.filter(user => user.notificationsEnabled || keep.has(user.id))
}

export function formatOrgUserLabel(
  user: Pick<OrgUser, 'id' | 'name'>,
  currentUserId?: string | null
): string {
  if (currentUserId && user.id === currentUserId) {
    return 'Você'
  }
  return user.name
}

export function formatOrgUserLabelByEmail(
  user: Pick<OrgUser, 'email' | 'name'>,
  currentUserEmail?: string | null
): string {
  if (currentUserEmail && user.email === currentUserEmail) {
    return 'Você'
  }
  return user.name
}
