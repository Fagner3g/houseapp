import dayjs from 'dayjs'

import { badRequest } from '@/core/errors'

export function normalizeScheduledAt(iso: string): Date {
  const scheduledEnd = dayjs(iso).endOf('day')
  const todayStart = dayjs().startOf('day')

  if (scheduledEnd.isBefore(todayStart)) {
    throw badRequest('scheduledAt must be today or in the future')
  }

  return scheduledEnd.toDate()
}
