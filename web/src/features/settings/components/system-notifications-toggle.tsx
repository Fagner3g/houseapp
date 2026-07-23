import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellOff, BellRing } from 'lucide-react'
import { useId } from 'react'
import { toast } from 'sonner'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { cn } from '@/lib/utils'

import {
  getSystemNotificationSettings,
  updateSystemNotificationSettings,
} from '../api/system-notification-settings'

const QUERY_KEY = 'system-notification-settings'

export function SystemNotificationsToggle() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const switchId = useId()

  const { data, isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => getSystemNotificationSettings(slug as string),
    enabled: !!slug,
  })

  const { mutateAsync, isPending } = useMutation({
    mutationFn: (enabled: boolean) =>
      updateSystemNotificationSettings(slug as string, enabled),
    onSuccess: saved => {
      queryClient.setQueryData([QUERY_KEY], saved)
      toast.success(
        saved.notificationsEnabled
          ? 'Notificações do sistema ativadas'
          : 'Notificações do sistema desativadas'
      )
    },
    onError: () => {
      toast.error('Erro ao atualizar notificações do sistema')
    },
  })

  const enabled = data?.notificationsEnabled ?? true
  const busy = isLoading || isPending

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border p-4',
        enabled
          ? 'border-slate-200 bg-slate-50/50'
          : 'border-amber-200 bg-amber-50/60'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {enabled ? (
              <BellRing className="size-4 text-slate-600" />
            ) : (
              <BellOff className="size-4 text-amber-700" />
            )}
            <Label htmlFor={switchId} className="font-medium text-slate-900">
              Notificações do sistema
            </Label>
          </div>
          <p className="text-sm text-slate-600">
            Interruptor global para todas as organizações. Desative em homologação para
            impedir alertas WhatsApp, in-app e resumos automáticos.
          </p>
        </div>
        <Switch
          id={switchId}
          checked={enabled}
          disabled={busy || !slug}
          onCheckedChange={checked => {
            void mutateAsync(checked)
          }}
        />
      </div>
      {!enabled && (
        <p className="text-xs font-medium text-amber-800">
          Notificações desativadas em todo o sistema
        </p>
      )}
    </div>
  )
}
