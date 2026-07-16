import { useEffect, useMemo, useState } from 'react'

import type { GetInstallmentSeries200InstallmentsItem } from '@/api/generated/model/getInstallmentSeries200InstallmentsItem'
import {
  advanceIdsCoveredByPreview,
  buildPaymentAllocationPreview,
} from '../../lib/payment-allocation-preview'
import {
  allReimbursementChoicesAnswered,
  defaultReimbursementChoices,
  type SplitReimbursementChoice,
} from '../../lib/unified-settlement'
import type { UnsettledSplitItem } from '../../split-debt-summary.utils'
import {
  computeAdvancePaymentTotalReais,
  listFutureUnpaidInstallments,
} from '../advance-installments-picker'
import type { PayInstallmentScopeResult } from './types'

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

  const future = useMemo(
    () => listFutureUnpaidInstallments(installments, currentInstallmentNumber),
    [installments, currentInstallmentNumber]
  )

  const currentItem = useMemo(
    () => installments.find(item => item.installmentNumber === currentInstallmentNumber),
    [installments, currentInstallmentNumber]
  )

  const [paidAmountReais, setPaidAmountReais] = useState(0)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [reimbursements, setReimbursements] = useState<SplitReimbursementChoice[]>([])
  const [advanceOpen, setAdvanceOpen] = useState(false)
  const [reimbursementOpen, setReimbursementOpen] = useState(false)

  const allocationParcels = useMemo(() => {
    const current = {
      id: currentItem?.id ?? '__current__',
      installmentNumber: currentInstallmentNumber,
      remainingReais: currentRemainingReais,
    }
    const futures = future.map(item => ({
      id: item.id,
      installmentNumber: item.installmentNumber,
      remainingReais: Number.parseFloat(item.remaining),
    }))
    return [current, ...futures]
  }, [currentItem?.id, currentInstallmentNumber, currentRemainingReais, future])

  useEffect(() => {
    if (!open) return
    setPaidAmountReais(Math.max(0, currentRemainingReais))
    setSelectedIds([])
    setAdvanceOpen(false)
    setReimbursementOpen(unsettledSplits.length > 0)
    setReimbursements(
      defaultReimbursementChoices(
        unsettledSplits.map(item => ({
          splitId: item.split.id,
          remainingReais: item.remainingReais,
        }))
      )
    )
  }, [open, currentRemainingReais, unsettledSplits])

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

  const confirmAmount = paidAmountReais
  const withSplits = unsettledSplits.length > 0
  const reimbursementsAnswered =
    !withSplits ||
    (reimbursements.length === unsettledSplits.length &&
      allReimbursementChoicesAnswered(reimbursements))
  const canConfirm =
    confirmAmount > 0.005 &&
    confirmAmount <= maxPayable + 0.005 &&
    preview.length > 0 &&
    reimbursementsAnswered

  const setPaidAmountFromInput = (value: number) => {
    const next = Math.max(0, value)
    setPaidAmountReais(next)
    const nextPreview = buildPaymentAllocationPreview(next, allocationParcels)
    setSelectedIds(advanceIdsCoveredByPreview(nextPreview, currentInstallmentNumber))
  }

  const selectAdvances = (ids: string[]) => {
    setSelectedIds(ids)
    setPaidAmountReais(
      ids.length === 0
        ? Math.max(0, currentRemainingReais)
        : computeAdvancePaymentTotalReais(currentRemainingReais, installments, ids)
    )
  }

  const updateReimbursement = (
    splitId: string,
    patch: Partial<SplitReimbursementChoice>
  ) => {
    setReimbursements(prev =>
      prev.map(choice => (choice.splitId === splitId ? { ...choice, ...patch } : choice))
    )
  }

  const buildResult = (): PayInstallmentScopeResult | null => {
    if (!canConfirm) return null
    return {
      paidAmountReais: confirmAmount,
      advanceTransactionIds: selectedIds,
      reimbursements,
    }
  }

  return {
    future,
    paidAmountReais,
    setPaidAmountFromInput,
    selectedIds,
    selectAdvances,
    reimbursements,
    updateReimbursement,
    preview,
    confirmAmount,
    canConfirm,
    withSplits,
    advanceOpen,
    setAdvanceOpen,
    reimbursementOpen,
    setReimbursementOpen,
    buildResult,
  }
}
