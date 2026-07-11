import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { invalidateTransactionQueries } from '@/features/transactions/lib/invalidate-transaction-queries'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { bulkReviewImport } from '@/lib/bulk-review-import'
import { useQueryClient } from '@tanstack/react-query'

import {
  buildInitialReviewRows,
  buildSplitPayload,
  type ImportReviewItem,
  type ImportReviewRowState,
  type ParsedTransactionReviewItem,
} from './import-review-types'
import { isCardStatementCreditTitle } from '@houseapp/finance-core'
import { ImportStatementReviewTable } from './import-statement-review-table'

interface ImportStatementReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: ImportReviewItem[]
  onComplete?: () => void
}

function toPreviewItems(items: ImportReviewItem[]): ParsedTransactionReviewItem[] {
  return items.map((item, index) => ({
    id: item.transactionId,
    index,
    title: item.title,
    amount: item.amount,
    date: new Date().toISOString(),
    type: item.type,
    categoryId: isCardStatementCreditTitle(item.title)
      ? null
      : (item.categoryIds[0] ?? null),
  }))
}

export function ImportStatementReviewDialog({
  open,
  onOpenChange,
  items,
  onComplete,
}: ImportStatementReviewDialogProps) {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const previewItems = useMemo(() => toPreviewItems(items), [items])
  const [rows, setRows] = useState<Record<string, ImportReviewRowState>>({})
  const [isSaving, setIsSaving] = useState(false)

  const initializedRows = useMemo(() => {
    const next = { ...rows }
    for (const item of previewItems) {
      if (!next[item.id]) {
        Object.assign(next, buildInitialReviewRows([item]))
      }
    }
    return next
  }, [rows, previewItems])

  const handleSave = async () => {
    if (!slug) return

    const updates = items
      .map(item => {
        const row = initializedRows[item.transactionId]
        if (!row) return null

        const update: {
          transactionId: string
          categoryIds?: string[]
          split?: NonNullable<ReturnType<typeof buildSplitPayload>>
        } = { transactionId: item.transactionId }

        if (row.categoryId && !isCardStatementCreditTitle(item.title)) {
          update.categoryIds = [row.categoryId]
        }

        const split = buildSplitPayload(item, row)
        if (split) {
          update.split = split
        }

        if (!update.categoryIds && !update.split) return null
        return update
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (!updates.length) {
      onOpenChange(false)
      onComplete?.()
      return
    }

    setIsSaving(true)
    try {
      const result = await bulkReviewImport(slug, updates)
      await invalidateTransactionQueries(queryClient, slug)
      toast.success(
        result.splitsCreated > 0
          ? `Revisão salva (${result.splitsCreated} divisão(ões) criada(s))`
          : 'Categorias atualizadas'
      )
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao salvar revisão'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-h-[90vh] w-[min(96rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-hidden sm:max-w-[min(96rem,calc(100vw-2rem))]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Revisar importação</DialogTitle>
        </DialogHeader>

        <p className="shrink-0 text-sm text-slate-500">
          Ajuste categorias e delegações dos lançamentos importados.
        </p>

        <div className="min-h-0 flex-1">
          <ImportStatementReviewTable
            items={previewItems}
            rows={rows}
            onRowsChange={setRows}
          />
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Pular
          </Button>
          <Button className="bg-slate-900" disabled={isSaving} onClick={() => void handleSave()}>
            Salvar revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
