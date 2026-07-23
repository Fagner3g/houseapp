import {
  formatAllocationPreviewLine,
  type AllocationPreviewStep,
} from '../../lib/payment-allocation-preview'
import type { SettlementKind } from '../../lib/settlement-copy'

type AllocationPreviewProps = {
  kind: SettlementKind
  preview: AllocationPreviewStep[]
}

export function AllocationPreview({ kind, preview }: AllocationPreviewProps) {
  if (preview.length <= 1) return null

  return (
    <div className="rounded-2xl bg-violet-50/70 px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-violet-700/80">
        Distribuição
      </p>
      <ul className="mt-2 space-y-1.5">
        {preview.map(step => (
          <li
            key={step.id}
            className="flex gap-2 text-sm leading-snug text-slate-700"
          >
            <span
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-400"
              aria-hidden
            />
            <span>{formatAllocationPreviewLine(step, kind)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
