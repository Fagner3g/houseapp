import { FileUp, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  selectHasImportDraft,
  selectImportDraftFileName,
  useImportStatementDraftStore,
} from '@/stores/import-statement-draft'

export function ImportDraftResumeBanner() {
  const open = useImportStatementDraftStore(s => s.open)
  const hasDraft = useImportStatementDraftStore(selectHasImportDraft)
  const fileName = useImportStatementDraftStore(selectImportDraftFileName)
  const openImportStatement = useImportStatementDraftStore(s => s.openImportStatement)
  const discardImportStatementDraft = useImportStatementDraftStore(s => s.discardImportStatementDraft)

  if (!hasDraft || open) return null

  return (
    <div className="fixed bottom-20 left-1/2 z-50 flex w-[min(100%,28rem)] -translate-x-1/2 items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 shadow-lg md:bottom-6">
      <FileUp className="size-4 shrink-0 text-violet-600" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-violet-950">
          Importação de fatura em andamento
        </p>
        <p className="truncate text-xs text-violet-800/80">{fileName}</p>
      </div>
      <Button
        type="button"
        size="sm"
        className="shrink-0 bg-violet-600 hover:bg-violet-700"
        onClick={() => openImportStatement()}
      >
        Retomar
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 shrink-0 text-violet-700 hover:bg-violet-100 hover:text-violet-900"
        onClick={discardImportStatementDraft}
        aria-label="Descartar importação"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
