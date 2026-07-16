import { useEffect, useMemo, useState } from 'react'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import {
  advanceIdsCoveredByPreview,
  buildPaymentAllocationPreview,
} from '../../lib/payment-allocation-preview'
import {
  isSettlementExtraOverdue,
  listFutureUnpaidInstallments,
  listSettlementExtraInstallments,
} from '../../lib/settlement-extra-installments'
import type { UnsettledSplitItem } from '../../split-debt-summary.utils'
import { computeAdvancePaymentTotalReais } from '../advance-installments-picker'
import type { PayInstallmentScopeResult } from './types'
import { useSettlementReimbursements } from './use-settlement-reimbursements'

export function usePayInstallmentScope(params: {
  open: boolean
  currentInstallmentNumber: number
  currentRemainingReais: number
  installments: GetInstallmentSeries200InstallmentsItem[]
  unsettledSplits: UnsettledSplitItem[]
}) {
  const {
    open,
    currentInstallmentNumber,
    currentRemainingReais,
    installments,
    unsettledSplits,
  } = params

  const extras = useMemo(
    () => listSettlementExtraInstallments(installments, currentInstallmentNumber),
    [installments, currentInstallmentNumber]
  )
  const future = useMemo(
    () => listFutureUnpaidInstallments(installments, currentInstallmentNumber),
    [installments, currentInstallmentNumber]
  )
  const hasOverdueExtras = extras.some(item =>
    isSettlementExtraOverdue(item, currentInstallmentNumber)
  )
  const currentItem = useMemo(
    () => installments.find(item => item.installmentNumber === currentInstallmentNumber),
    [installments, currentInstallmentNumber]
  )

  const [paidAmountReais, setPaidAmountReais] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const reimbursement = useSettlementReimbursements(open, unsettledSplits)

  const allocationParcels = useMemo(() => {
    const current = {
      id: currentItem?.id ?? '__current__',
      installmentNumber: currentInstallmentNumber,
      remainingReais: currentRemainingReais,
    }
    return [
      current,
      ...extras.map(item => ({
        id: item.id,
        installmentNumber: item.installmentNumber,
        remainingReais: Number.parseFloat(item.remaining),
      })),
    ]
  }, [currentItem?.id, currentInstallmentNumber, currentRemainingReais, extras])

  useEffect(() => {
    if (!open) return
    setPaidAmountReais(Math.max(0, currentRemainingReais))
    setSelectedIds([])
    setAdvanceOpen(hasOverdueExtras)
  }, [open, currentRemainingReais, hasOverdueExtras])

  useEffect(() => {
    if (selectedIds.length > 0) setAdvanceOpen(true)
  }, [selectedIds.length])

  const maxPayable = useMemo(
    () => allocationParcels.reduce((sum, p) => sum + Math.max(0, p.remainingReais), 0),
    [allocationParcels]
  )
  const preview = useMemo(
    () => buildPaymentAllocationPreview(paidAmountReais, allocationParcels),
    [paidAmountReais, allocationParcels]
  )

  const canConfirm =
    paidAmountReais > 0.005 &&
    paidAmountReais <= maxPayable + 0.005 &&
    preview.length > 0 &&
    reimbursement.reimbursementsAnswered

  const setPaidAmountFromInput = (value: number) => {
    const next = Math.max(0, value)
    setPaidAmountReais(next)
    setSelectedIds(
      advanceIdsCoveredByPreview(
        buildPaymentAllocationPreview(next, allocationParcels),
        currentInstallmentNumber
      )
    )
  }

  const selectAdvances = (ids: string[]) => {
    setSelectedIds(ids)
    setPaidAmountReais(
      ids.length === 0
        ? Math.max(0, currentRemainingReais)
        : computeAdvancePaymentTotalReais(currentRemainingReais, installments, ids)
    )
  }

  const buildResult = (): PayInstallmentScopeResult | null => {
    if (!canConfirm) return null
    return {
      paidAmountReais,
      advanceTransactionIds: selectedIds,
      reimbursements: reimbursement.reimbursements,
    }
  }

  return {
    extras,
    future,
    paidAmountReais,
    setPaidAmountFromInput,
    selectedIds,
    selectAdvances,
    reimbursements: reimbursement.reimbursements,
    updateReimbursement: reimbursement.updateReimbursement,
    preview,
    confirmAmount: paidAmountReais,
    canConfirm,
    withSplits: reimbursement.withSplits,
    advanceOpen,
    setAdvanceOpen,
    reimbursementOpen: reimbursement.reimbursementOpen,
    setReimbursementOpen: reimbursement.setReimbursementOpen,
    buildResult,
  }
}
