import { Users } from 'lucide-react'

import type { UnsettledSplitItem } from '../../split-debt-summary.utils'
import { reimbursementStepTitle } from '../../lib/split-reimbursement-copy'
import type { SplitReimbursementChoice } from '../../lib/unified-settlement'
import { OptionalSection } from './optional-section'
import { PersonRow } from './person-row'

type ReimbursementSectionProps = {
  items: UnsettledSplitItem[]
  choices: SplitReimbursementChoice[]
  onChange: (splitId: string, patch: Partial<SplitReimbursementChoice>) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReimbursementSection({
  items,
  choices,
  onChange,
  open,
  onOpenChange,
}: ReimbursementSectionProps) {
  if (items.length === 0) return null

  const answeredCount = choices.filter(c => c.reimbursed !== null).length
  const reimbursedCount = choices.filter(c => c.reimbursed === true).length
  const summary =
    answeredCount === items.length && reimbursedCount > 0 ? (
      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-800">
        {reimbursedCount} de {items.length}
      </span>
    ) : answeredCount === items.length ? (
      <span className="rounded-full bg-slate-200/90 px-2 py-0.5 text-[11px] font-medium text-slate-700">
        Respondido
      </span>
    ) : (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
        {items.length - answeredCount} pendente
        {items.length - answeredCount === 1 ? '' : 's'}
      </span>
    )

  return (
    <OptionalSection
      icon={Users}
      title={reimbursementStepTitle()}
      hint="Marque quem já te reembolsou nesta parcela"
      summary={summary}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="max-h-[36vh] space-y-2.5 overflow-y-auto pr-0.5">
        {items.map(item => {
          const choice = choices.find(c => c.splitId === item.split.id)
          if (!choice) return null
          return (
            <PersonRow
              key={item.split.id}
              item={item}
              choice={choice}
              onChange={patch => onChange(item.split.id, patch)}
            />
          )
        })}
      </div>
    </OptionalSection>
  )
}
