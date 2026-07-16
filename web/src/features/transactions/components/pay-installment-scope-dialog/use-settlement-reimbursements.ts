import { useEffect, useState } from 'react'

import {
  allReimbursementChoicesAnswered,
  defaultReimbursementChoices,
  type SplitReimbursementChoice,
} from '../../lib/unified-settlement'
import type { UnsettledSplitItem } from '../../split-debt-summary.utils'

export function useSettlementReimbursements(
  open: boolean,
  unsettledSplits: UnsettledSplitItem[]
) {
  const [reimbursements, setReimbursements] = useState<SplitReimbursementChoice[]>([])
  const [reimbursementOpen, setReimbursementOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    setReimbursementOpen(unsettledSplits.length > 0)
    setReimbursements(
      defaultReimbursementChoices(
        unsettledSplits.map(item => ({
          splitId: item.split.id,
          remainingReais: item.remainingReais,
        }))
      )
    )
  }, [open, unsettledSplits])

  const withSplits = unsettledSplits.length > 0
  const reimbursementsAnswered =
    !withSplits ||
    (reimbursements.length === unsettledSplits.length &&
      allReimbursementChoicesAnswered(reimbursements))

  const updateReimbursement = (
    splitId: string,
    patch: Partial<SplitReimbursementChoice>
  ) => {
    setReimbursements(prev =>
      prev.map(choice => (choice.splitId === splitId ? { ...choice, ...patch } : choice))
    )
  }

  return {
    reimbursements,
    updateReimbursement,
    withSplits,
    reimbursementsAnswered,
    reimbursementOpen,
    setReimbursementOpen,
  }
}
