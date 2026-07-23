/**
 * When payment exceeds the current installment remaining, apply it across open
 * parcels in order: full pay each until the remainder lands as partial on one.
 *
 * Returns null when payment does not overpay the first parcel (use underpay /
 * single-parcel paths instead).
 */
export type OverpaymentWaterfallStep = {
  id: string
  apply: bigint
  status: 'paid' | 'partial'
}

export type OverpaymentWaterfallParcel = {
  id: string
  remaining: bigint
}

export function allocateOverpaymentWaterfall(input: {
  parcels: OverpaymentWaterfallParcel[]
  payment: bigint
}): OverpaymentWaterfallStep[] | null {
  const { parcels, payment } = input
  if (payment <= 0n || parcels.length === 0) return null

  const first = parcels[0]
  if (!first || first.remaining <= 0n || payment <= first.remaining) return null

  const totalRemaining = parcels.reduce((sum, p) => sum + (p.remaining > 0n ? p.remaining : 0n), 0n)
  if (payment > totalRemaining) return null

  let left = payment
  const steps: OverpaymentWaterfallStep[] = []

  for (const parcel of parcels) {
    if (left <= 0n) break
    if (parcel.remaining <= 0n) continue

    const apply = left >= parcel.remaining ? parcel.remaining : left
    left -= apply
    steps.push({
      id: parcel.id,
      apply,
      status: apply >= parcel.remaining ? 'paid' : 'partial',
    })
  }

  return steps.length > 0 ? steps : null
}
