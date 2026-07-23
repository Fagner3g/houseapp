/** Resolve who receives a member-targeted transaction reminder. */
export function resolveTargetedMemberUserId(
  notifyUserId: string | null | undefined,
  limitToUserId?: string
): string | null {
  return limitToUserId ?? notifyUserId ?? null
}
