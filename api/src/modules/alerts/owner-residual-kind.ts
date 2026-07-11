/** Owner residual WhatsApp kinds (house obligations, not delegated splits). */
export function isOwnerResidualAlertKind(kind: string | null | undefined): boolean {
  return (
    kind === 'invoice_upcoming' ||
    kind === 'invoice_overdue' ||
    kind === 'owner_upcoming' ||
    kind === 'owner_overdue'
  )
}
