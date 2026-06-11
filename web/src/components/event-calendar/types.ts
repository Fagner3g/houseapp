export type CalendarView = "month" | "week" | "day" | "agenda"

export type CalendarEventType = "transaction" | "reminder"

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: Date
  end: Date
  allDay?: boolean
  color?: EventColor
  location?: string
  status?: string
  overdueDays?: number
  /** Compact currency label for month cells, e.g. "R$119,90". */
  amountLabel?: string
  /** Installment hint shown next to title, e.g. "12x". */
  installmentLabel?: string
  /** Secondary status line, e.g. "4d · Parcial · pago R$200 · falta R$356". */
  statusLine?: string
  /** Amount paid so far in cents (partial payments). */
  valuePaid?: number | null
  eventType?: CalendarEventType
}

export type EventColor =
  | "sky"
  | "amber"
  | "violet"
  | "rose"
  | "emerald"
  | "orange"
