import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  RadioGroup,
  RadioGroupIndicator,
  RadioGroupItem,
} from '@/components/ui/radio-group'
import type { InstallmentDateScope } from '../../lib/installment-date-scope'

const OPTIONS: Array<{ value: InstallmentDateScope; label: string; hint: string }> = [
  {
    value: 'current',
    label: 'Só esta parcela',
    hint: 'Altera apenas o vencimento deste lançamento.',
  },
  {
    value: 'from_here',
    label: 'Esta e as seguintes',
    hint: 'Desloca o vencimento desta e das parcelas posteriores.',
  },
  {
    value: 'all',
    label: 'Todas as parcelas',
    hint: 'Desloca o vencimento de todas as parcelas abertas da série.',
  },
]

type EditInstallmentDateScopeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  installmentNumber: number
  installmentsTotal: number
  onConfirm: (scope: InstallmentDateScope) => void
}

export function EditInstallmentDateScopeDialog({
  open,
  onOpenChange,
  installmentNumber,
  installmentsTotal,
  onConfirm,
}: EditInstallmentDateScopeDialogProps) {
  const [scope, setScope] = useState<InstallmentDateScope>('current')

  useEffect(() => {
    if (open) setScope('current')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1.5 border-b border-slate-100 px-6 py-5 pr-12">
          <DialogTitle className="text-xl tracking-tight">
            Alterar vencimento
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Esta é a parcela {installmentNumber} de {installmentsTotal}. Em quais
            parcelas o novo vencimento deve valer?
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5">
          <RadioGroup
            value={scope}
            onValueChange={value => setScope(value as InstallmentDateScope)}
          >
            {OPTIONS.map(option => (
              <RadioGroupItem key={option.value} value={option.value}>
                <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
                  <span className="text-sm font-medium text-zinc-900">{option.label}</span>
                  <span className="text-xs text-zinc-500">{option.hint}</span>
                </span>
                <RadioGroupIndicator />
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(scope)
              onOpenChange(false)
            }}
          >
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
