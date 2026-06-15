import { describe, expect, it } from 'vitest'

import type { CalendarEvent } from '@/components/event-calendar'
import { partitionDayEvents, sortEventsWithTransbordoFirst } from './utils'

function mockEvent(overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'id' | 'title'>): CalendarEvent {
  return {
    start: new Date('2026-06-15T12:00:00'),
    end: new Date('2026-06-15T12:00:00'),
    allDay: true,
    ...overrides,
  }
}

describe('calendar event sorting', () => {
  it('shows pending items before completed ones in do mês', () => {
    const events = [
      mockEvent({ id: 'paid-1', title: 'CEMIG', status: 'paid' }),
      mockEvent({ id: 'pending-1', title: 'Cartão Ruivas', status: 'pending' }),
      mockEvent({ id: 'paid-2', title: 'Celular', status: 'paid' }),
    ]

    const { doMes } = partitionDayEvents(sortEventsWithTransbordoFirst(events))

    expect(doMes.map(event => event.id)).toEqual(['pending-1', 'paid-1', 'paid-2'])
  })

  it('shows pending transbordo before completed transbordo', () => {
    const events = [
      mockEvent({
        id: 'paid-transbordo',
        title: 'Pago',
        status: 'paid',
        isTransbordo: true,
        overdueDays: 10,
      }),
      mockEvent({
        id: 'pending-transbordo',
        title: 'Empréstimo',
        status: 'pending',
        isTransbordo: true,
        overdueDays: 5,
      }),
    ]

    const { transbordo } = partitionDayEvents(sortEventsWithTransbordoFirst(events))

    expect(transbordo.map(event => event.id)).toEqual(['pending-transbordo', 'paid-transbordo'])
  })
})
