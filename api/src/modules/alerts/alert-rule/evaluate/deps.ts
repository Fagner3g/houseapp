import type { NotificationRepository } from '../../notification.repository'
import type { SplitRepository } from '@/modules/splits/split.repository'

export type EvaluateNotifyDeps = {
  notificationRepository: NotificationRepository
  splitRepository: SplitRepository
}
