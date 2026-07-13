import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import type { ListPendingSplits200SplitsItem } from '@/api/generated/model'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatCentsString, formatCurrency, moneyStringToCents } from '@/lib/currency'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { readHttpErrorMessage } from '@/lib/http'
import { listManualAlertTargets } from '@/features/settings/api/list-manual-alert-targets'
import { sendManualAlert } from '@/features/settings/api/send-manual-alert'

import { pendingSplitDisplayTitle } from '@/features/transactions/lib/pending-split-display-title'

import {
  pendingSplitAlertType,
  pendingSplitTargetKey,
} from '../lib/pending-split-charge'

export function AttentionSplitsList({
  splits,
  total,
}: {
  splits: ListPendingSplits200SplitsItem[]
  total: string
}) {
  const { slug } = useActiveOrganization()
  const [chargingKey, setChargingKey] = useState<string | null>(null)

  const { data: targetsData } = useQuery({
    queryKey: ['manual-alert-targets', slug],
    queryFn: () => listManualAlertTargets(slug as string),
    enabled: !!slug && splits.length > 0,
  })

  const targetsByKey = new Map((targetsData?.targets ?? []).map(target => [target.key, target]))

  const charge = async (split: ListPendingSplits200SplitsItem) => {
    if (!slug) return
    const targetKey = pendingSplitTargetKey(split)
    const target = targetsByKey.get(targetKey)
    const phone = target?.phone ?? split.contactPhone
    if (!phone) {
      toast.error('Configure o telefone do contato em Configurações → Alertas')
      return
    }

    const personName = split.personName ?? split.contactName ?? 'contato'
    const type = pendingSplitAlertType(split)
    setChargingKey(split.id)
    try {
      const result = await sendManualAlert(slug, targetKey, type)
      if (result.sent === 0) {
        toast.message(`Nenhuma mensagem enviada para ${personName}`)
      } else if (result.errors > 0) {
        toast.warning(
          `Cobrança: ${result.sent} enviada(s), ${result.errors} erro(s) para ${personName}`
        )
      } else {
        toast.success(`Cobrança enviada para ${personName}`)
      }
    } catch (error) {
      toast.error(await readHttpErrorMessage(error, 'Erro ao cobrar'))
    } finally {
      setChargingKey(null)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-amber-600">Total: {formatCentsString(total)}</p>
      {splits.slice(0, 4).map(split => {
        const remainingCents = Math.max(
          0,
          moneyStringToCents(split.amount) - moneyStringToCents(split.paidAmount)
        )
        const targetKey = pendingSplitTargetKey(split)
        const target = targetsByKey.get(targetKey)
        const phone = target?.phone ?? split.contactPhone
        const canCharge = Boolean(phone)
        const isCharging = chargingKey === split.id

        return (
          <div
            key={split.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">
                {split.personName ?? split.contactName ?? 'Contato'}
              </p>
              <p className="truncate text-sm text-slate-500">
                {pendingSplitDisplayTitle(split.transactionTitle, split.collectLumpSum)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="font-medium tabular-nums text-amber-600">
                {formatCurrency(remainingCents / 100)}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canCharge || !!chargingKey}
                      onClick={() => void charge(split)}
                    >
                      {isCharging ? 'Enviando…' : 'Cobrar'}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {canCharge
                    ? 'Enviar lembrete por WhatsApp'
                    : 'Configure o telefone do contato em Configurações → Alertas'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )
      })}
    </div>
  )
}
