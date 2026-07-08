import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  useImportStatementDraftStore,
  type ImportStatementContext,
} from '@/stores/import-statement-draft'

type ImportStatementTriggerButtonProps = {
  context?: ImportStatementContext
  onImported?: (accountId: string) => void
  onViewExistingStatement?: (params: { accountId: string; monthKey: string }) => void
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
}

export function ImportStatementTriggerButton({
  context,
  onImported,
  onViewExistingStatement,
  className,
  size,
  variant = 'default',
}: ImportStatementTriggerButtonProps) {
  const openImportStatement = useImportStatementDraftStore(s => s.openImportStatement)

  return (
    <Button
      type="button"
      className={className ?? (variant === 'default' ? 'bg-slate-900' : undefined)}
      size={size}
      variant={variant}
      onClick={() =>
        openImportStatement({
          context,
          onImported,
          onViewExistingStatement,
        })
      }
    >
      <Upload className="mr-2 size-4" />
      Importar fatura
    </Button>
  )
}
