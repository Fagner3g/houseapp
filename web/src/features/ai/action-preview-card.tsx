import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ActionPreviewItem } from './use-ai-chat'

interface ActionPreviewCardProps {
  item: ActionPreviewItem
  onConfirm: (actionId: string) => Promise<void>
  onReject: (actionId: string) => Promise<void>
  onEdit?: (actionId: string, message: string) => void
}

const ACTION_LABELS: Record<string, string> = {
  create_transaction: 'Criar transação',
  create_split: 'Criar divisão',
  pay_transaction: 'Registrar pagamento',
  register_split_payment: 'Registrar pagamento de divisão',
  import_statement: 'Importar fatura',
}

export function ActionPreviewCard({
  item,
  onConfirm,
  onReject,
  onEdit,
}: ActionPreviewCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.message)

  const isResolved = item.status !== 'pending'

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm(item.actionId)
      toast.success('Ação confirmada')
    } catch {
      toast.error('Erro ao confirmar ação')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    try {
      await onReject(item.actionId)
      toast.success('Ação cancelada')
    } catch {
      toast.error('Erro ao cancelar ação')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = () => {
    if (isEditing) {
      onEdit?.(item.actionId, editText)
      setIsEditing(false)
      return
    }
    setIsEditing(true)
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-violet-900">
            {ACTION_LABELS[item.action] ?? item.action}
          </p>
          <p className="mt-1 text-sm text-slate-700">{item.message}</p>
        </div>
        {isResolved && (
          <Badge variant={item.status === 'confirmed' ? 'default' : 'outline'}>
            {item.status === 'confirmed' ? 'Confirmado' : 'Cancelado'}
          </Badge>
        )}
      </div>

      {Object.keys(item.data).length > 0 && (
        <pre className="mb-3 max-h-32 overflow-auto rounded-lg bg-white/80 p-2 text-xs text-slate-600">
          {JSON.stringify(item.data, null, 2)}
        </pre>
      )}

      {!isResolved && (
        <>
          {isEditing && (
            <Textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              rows={3}
              className="mb-3 bg-white"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-slate-900"
              disabled={isLoading}
              onClick={handleConfirm}
            >
              <Check className="mr-1 size-3.5" />
              Confirmar
            </Button>
            <Button size="sm" variant="outline" disabled={isLoading} onClick={handleReject}>
              <X className="mr-1 size-3.5" />
              Cancelar
            </Button>
            {onEdit && (
              <Button size="sm" variant="ghost" disabled={isLoading} onClick={handleEdit}>
                <Pencil className="mr-1 size-3.5" />
                {isEditing ? 'Aplicar' : 'Editar'}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
