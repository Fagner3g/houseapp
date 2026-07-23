import { useQueryClient } from '@tanstack/react-query'
import type { MouseEvent } from 'react'
import { toast } from 'sonner'

import {
  getListPendingNotificationsQueryKey,
  getListSplitPaymentRequestsQueryKey,
  getListSplitsQueryKey,
  useAcceptSplitPaymentRequest,
  useListPendingNotifications,
  useMarkInformationalNotificationsRead,
  useMarkNotificationRead,
  useRejectSplitPaymentRequest,
} from '@/api/generated/api'
import type { ListPendingNotifications200NotificationsItem } from '@/api/generated/model'
import { useActiveOrganization } from '@/hooks/use-active-organization'
import { readHttpErrorMessage } from '@/lib/http'
import { useDrawerStore } from '@/stores/drawers'

import {
  countInformational,
  isInboxChannel,
  sortInboxNotifications,
} from '../lib/display'
import { readNotificationMetadata, readRequestId } from '../lib/kinds'

const VISIBLE_LIMIT = 10

export function useNotificationsMenu() {
  const { slug } = useActiveOrganization()
  const queryClient = useQueryClient()
  const openTransactionDrawer = useDrawerStore(s => s.openTransactionDrawer)
  const openEditAccountDrawer = useDrawerStore(s => s.openEditAccountDrawer)

  const { data, isLoading } = useListPendingNotifications({
    query: { refetchInterval: 60_000 },
  })
  const { mutateAsync: markRead } = useMarkNotificationRead()
  const { mutateAsync: markInformationalRead, isPending: isMarkingAll } =
    useMarkInformationalNotificationsRead()
  const { mutateAsync: acceptRequest, isPending: isAccepting } = useAcceptSplitPaymentRequest()
  const { mutateAsync: rejectRequest, isPending: isRejecting } = useRejectSplitPaymentRequest()

  const notifications = sortInboxNotifications(
    (data?.notifications ?? []).filter(n => isInboxChannel(n.channel))
  )
  const unreadCount = notifications.length
  const informationalCount = countInformational(notifications)
  const visible = notifications.slice(0, VISIBLE_LIMIT)
  const hiddenCount = Math.max(0, notifications.length - VISIBLE_LIMIT)
  const isResponding = isAccepting || isRejecting

  const invalidatePending = () => {
    queryClient.invalidateQueries({ queryKey: getListPendingNotificationsQueryKey() })
  }

  const invalidateAfterResponse = (transactionId: string | null | undefined) => {
    invalidatePending()
    if (!slug) return
    queryClient.invalidateQueries({ queryKey: getListSplitPaymentRequestsQueryKey(slug) })
    if (transactionId) {
      queryClient.invalidateQueries({
        queryKey: getListSplitsQueryKey(slug, transactionId),
      })
    }
  }

  const handleOpen = async (notification: ListPendingNotifications200NotificationsItem) => {
    try {
      await markRead({ id: notification.id })
      invalidatePending()
    } catch {
      // ignore mark-read errors in menu
    }

    if (notification.transactionId) {
      openTransactionDrawer(undefined, notification.transactionId)
      return
    }
    if (notification.accountId) {
      openEditAccountDrawer(notification.accountId)
    }
  }

  const handleMarkInformationalRead = async (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    try {
      const result = await markInformationalRead()
      invalidatePending()
      if (result.markedCount > 0) {
        toast.success(
          result.markedCount === 1
            ? '1 notificação marcada como lida'
            : `${result.markedCount} notificações marcadas como lidas`
        )
      }
    } catch {
      toast.error('Erro ao marcar notificações como lidas')
    }
  }

  const respondToRequest = async (
    notification: ListPendingNotifications200NotificationsItem,
    event: MouseEvent,
    action: 'accept' | 'reject'
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const requestId = readRequestId(readNotificationMetadata(notification.metadata))
    if (!slug || !requestId) return
    try {
      if (action === 'accept') await acceptRequest({ slug, requestId })
      else await rejectRequest({ slug, requestId })
      await markRead({ id: notification.id })
      toast.success(action === 'accept' ? 'Pagamento confirmado' : 'Pedido recusado')
      invalidateAfterResponse(notification.transactionId)
    } catch (error) {
      const message = await readHttpErrorMessage(error, '')
      if (message.includes('no longer pending')) {
        await markRead({ id: notification.id }).catch(() => undefined)
        invalidatePending()
        toast.message('Este pedido já foi resolvido')
        return
      }
      toast.error(action === 'accept' ? 'Erro ao confirmar pagamento' : 'Erro ao recusar pedido')
    }
  }

  const handleAccept = (
    notification: ListPendingNotifications200NotificationsItem,
    event: MouseEvent
  ) => respondToRequest(notification, event, 'accept')

  const handleReject = (
    notification: ListPendingNotifications200NotificationsItem,
    event: MouseEvent
  ) => respondToRequest(notification, event, 'reject')

  return {
    isLoading,
    unreadCount,
    informationalCount,
    visible,
    hiddenCount,
    isResponding,
    isMarkingAll,
    handleOpen,
    handleMarkInformationalRead,
    handleAccept,
    handleReject,
  }
}
