import { useId } from 'react'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface SplitParcelChargeToggleProps {
  checked: boolean
  onCheckedChange: (parcelCharge: boolean) => void
  banner?: string
}

/** Toggle: charge debtor per installment (on) vs lump-sum on current/first parcel (off). */
export function SplitParcelChargeToggle({
  checked,
  onCheckedChange,
  banner,
}: SplitParcelChargeToggleProps) {
  const id = useId()

  return (
    <div className="space-y-2">
      {banner && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{banner}</p>
      )}
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className="text-sm text-slate-600">
          Parcelar cobrança para esta pessoa
        </Label>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  )
}
