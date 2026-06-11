"use client"

import { useMemo } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { DraggableAttributes } from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { differenceInMinutes, format, getMinutes, isPast } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  AlertCircle,
  Bell,
  Check,
  CircleDashed,
  Clock,
} from "lucide-react"

import {
  getBorderRadiusClasses,
  getEventColorClasses,
} from "@/components/event-calendar"
import type { CalendarEvent } from "@/components/event-calendar"
import { alertStatusIconClass } from "@/lib/alert-status-colors"
import { cn } from "@/lib/utils"

// Using date-fns format with custom formatting:
// 'h' - hours (1-12)
// 'a' - am/pm
// ':mm' - minutes with leading zero (only if the token 'mm' is present)
const formatTimeWithOptionalMinutes = (date: Date) => {
  return format(
    date,
    getMinutes(date) === 0 ? "H'h'" : "H'h'mm",
    { locale: ptBR }
  )
}

function getEventTypeBorderClass(event: CalendarEvent): string {
  if (event.eventType === "reminder" || event.color === "violet") {
    return "border-l-violet-500/80 dark:border-l-violet-400/90"
  }
  if (event.color === "emerald") {
    return "border-l-emerald-500/80 dark:border-l-emerald-400/90"
  }
  return "border-l-rose-500/80 dark:border-l-rose-400/90"
}

type EventVisualStatus =
  | "paid"
  | "partial"
  | "overdue"
  | "reminder"
  | "upcoming"
  | "default"

function getEventVisualStatus(event: CalendarEvent): EventVisualStatus {
  if (event.eventType === "reminder") {
    return event.status === "paid" ? "paid" : "reminder"
  }
  if (event.status === "paid") return "paid"
  if (event.isTransbordo && event.overdueDays && event.overdueDays > 0) return "overdue"
  if (event.status === "partial") return "partial"
  if (event.overdueDays && event.overdueDays > 0) return "overdue"
  return "upcoming"
}

function EventStatusIcon({
  event,
  size = "sm",
}: {
  event: CalendarEvent
  size?: "sm" | "xs"
}) {
  const visualStatus = getEventVisualStatus(event)
  const iconClass = cn(
    "shrink-0",
    size === "xs" ? "size-2.5" : "size-3"
  )

  switch (visualStatus) {
    case "paid":
      return (
        <Check
          className={cn(iconClass, "text-muted-foreground/80")}
          aria-hidden
        />
      )
    case "partial":
      return (
        <CircleDashed
          className={cn(iconClass, alertStatusIconClass.partial)}
          aria-hidden
        />
      )
    case "overdue":
      return (
        <AlertCircle
          className={cn(iconClass, alertStatusIconClass.overdue)}
          aria-hidden
        />
      )
    case "reminder":
      return (
        <Bell
          className={cn(iconClass, alertStatusIconClass.reminder)}
          aria-hidden
        />
      )
    case "upcoming":
      return (
        <Clock
          className={cn(iconClass, alertStatusIconClass.upcoming)}
          aria-hidden
        />
      )
    default:
      return null
  }
}

function MonthEventContent({ event }: { event: CalendarEvent }) {
  const isPaid = event.status === "paid"

  return (
    <div className="flex w-full min-w-0 flex-col justify-center gap-px">
      <div className="flex min-w-0 items-baseline justify-between gap-1 leading-none">
        <div className="flex min-w-0 items-baseline gap-0.5">
          <span
            className={cn(
              "truncate font-medium",
              isPaid && "line-through opacity-70"
            )}
          >
            {event.title}
          </span>
          {event.installmentLabel && (
            <span className="shrink-0 text-[9px] font-medium opacity-60">
              {event.installmentLabel}
            </span>
          )}
        </div>
        {event.amountLabel && (
          <span className="shrink-0 text-[9px] font-semibold tabular-nums opacity-90">
            {event.amountLabel}
          </span>
        )}
      </div>

      {event.statusLine && (
        <div className="flex min-w-0 items-center gap-0.5 text-[9px] leading-none opacity-75">
          <EventStatusIcon event={event} size="xs" />
          <span className="truncate">{event.statusLine}</span>
        </div>
      )}
    </div>
  )
}

interface EventWrapperProps {
  event: CalendarEvent
  isFirstDay?: boolean
  isLastDay?: boolean
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  className?: string
  children: React.ReactNode
  dndListeners?: SyntheticListenerMap
  dndAttributes?: DraggableAttributes
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
  variant?: "month" | "timed"
}

// Shared wrapper component for event styling
function EventWrapper({
  event,
  isFirstDay = true,
  isLastDay = true,
  isDragging,
  onClick,
  className,
  children,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
  variant = "timed",
}: EventWrapperProps) {
  const isPaid = event.status === "paid"
  const isPartial = event.status === "partial"
  const isTransbordo = event.isTransbordo === true

  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex size-full overflow-hidden text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-paid:opacity-80",
        variant === "month"
          ? "border-l-2 px-1 py-0.5 sm:px-1.5"
          : "px-1 sm:px-2 data-partial:ring-1 data-partial:ring-amber-500/60",
        isTransbordo && "data-transbordo:ring-1 data-transbordo:ring-destructive/50",
        getEventTypeBorderClass(event),
        getEventColorClasses(event.color),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className
      )}
      data-dragging={isDragging || undefined}
      data-paid={isPaid || undefined}
      data-partial={isPartial || undefined}
      data-transbordo={isTransbordo || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      {children}
    </button>
  )
}

interface EventItemProps {
  event: CalendarEvent
  view: "month" | "week" | "day" | "agenda"
  isDragging?: boolean
  onClick?: (e: React.MouseEvent) => void
  showTime?: boolean
  currentTime?: Date // For updating time during drag
  isFirstDay?: boolean
  isLastDay?: boolean
  children?: React.ReactNode
  className?: string
  dndListeners?: SyntheticListenerMap
  dndAttributes?: DraggableAttributes
  onMouseDown?: (e: React.MouseEvent) => void
  onTouchStart?: (e: React.TouchEvent) => void
}

export function EventItem({
  event,
  view,
  isDragging,
  onClick,
  showTime,
  currentTime,
  isFirstDay = true,
  isLastDay = true,
  children,
  className,
  dndListeners,
  dndAttributes,
  onMouseDown,
  onTouchStart,
}: EventItemProps) {
  const eventColor = event.color

  const isPaid = event.status === "paid"
  const isPartial = event.status === "partial"
  const isTransbordo = event.isTransbordo === true

  const statusBadge = (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="ml-1 inline-flex shrink-0">
          <EventStatusIcon event={event} />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {event.statusLine ??
          event.description ??
          (isTransbordo
            ? "Vencida · Transbordo"
            : isPartial
              ? "Pagamento parcial"
              : event.overdueDays
                ? `${event.overdueDays} dias em atraso`
                : "Evento")}
      </TooltipContent>
    </Tooltip>
  )

  const showStatusBadge =
    isPaid ||
    isPartial ||
    isTransbordo ||
    (event.overdueDays != null && event.overdueDays > 0) ||
    event.eventType === "reminder"

  // Use the provided currentTime (for dragging) or the event's actual time
  const displayStart = useMemo(() => {
    return currentTime || new Date(event.start)
  }, [currentTime, event.start])

  const displayEnd = useMemo(() => {
    return currentTime
      ? new Date(
          new Date(currentTime).getTime() +
            (new Date(event.end).getTime() - new Date(event.start).getTime())
        )
      : new Date(event.end)
  }, [currentTime, event.start, event.end])

  // Calculate event duration in minutes
  const durationMinutes = useMemo(() => {
    return differenceInMinutes(displayEnd, displayStart)
  }, [displayStart, displayEnd])

  const getEventTime = () => {
    if (event.allDay) return "All day"

    // For short events (less than 45 minutes), only show start time
    if (durationMinutes < 45) {
      return formatTimeWithOptionalMinutes(displayStart)
    }

    // For longer events, show both start and end time
    return `${formatTimeWithOptionalMinutes(displayStart)} - ${formatTimeWithOptionalMinutes(displayEnd)}`
  }

  if (view === "month") {
    const content = (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        variant="month"
        className={cn(
          "mt-[var(--event-gap)] h-[var(--event-height)] items-start text-[10px] leading-tight sm:text-[11px]",
          className
        )}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || <MonthEventContent event={event} />}
      </EventWrapper>
    )

    const tooltipText = [event.description, event.statusLine]
      .filter(Boolean)
      .join(" · ")

    return tooltipText ? (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    ) : (
      content
    )
  }

  if (view === "week" || view === "day") {
    const content = (
      <EventWrapper
        event={event}
        isFirstDay={isFirstDay}
        isLastDay={isLastDay}
        isDragging={isDragging}
        onClick={onClick}
        className={cn(
          "py-1",
          durationMinutes < 45 ? "items-center" : "flex-col",
          view === "week" ? "text-[10px] sm:text-xs" : "text-xs",
          className
        )}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {durationMinutes < 45 ? (
          <div className="flex w-full items-center justify-between truncate">
            <span className={cn("truncate", isPaid && "line-through opacity-70")}>
              {event.title}{" "}
              {showTime && (
                <span className="opacity-70">
                  {formatTimeWithOptionalMinutes(displayStart)}
                </span>
              )}
            </span>
            {showStatusBadge ? statusBadge : null}
          </div>
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <div
                className={cn(
                  "truncate font-medium",
                  isPaid && "line-through opacity-70"
                )}
              >
                {event.title}
              </div>
              {showStatusBadge ? statusBadge : null}
            </div>
            {showTime && (
              <div className="truncate font-normal opacity-70 sm:text-[11px]">
                {getEventTime()}
              </div>
            )}
          </>
        )}
      </EventWrapper>
    )

    return event.description ? (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{event.description}</TooltipContent>
      </Tooltip>
    ) : (
      content
    )
  }

  // Agenda view - kept separate since it's significantly different
  const agendaContent = (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded border-l-2 p-2 text-left transition outline-none focus-visible:ring-[3px] data-past-event:opacity-90 data-paid:opacity-80 data-partial:ring-1 data-partial:ring-amber-500/60 data-transbordo:ring-1 data-transbordo:ring-destructive/50",
        getEventTypeBorderClass(event),
        getEventColorClasses(eventColor),
        className
      )}
      data-past-event={isPast(new Date(event.end)) || undefined}
      data-paid={isPaid || undefined}
      data-partial={isPartial || undefined}
      data-transbordo={isTransbordo || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <span className={cn("min-w-0 truncate", isPaid && "line-through opacity-70")}>
          {event.title}
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {event.amountLabel && (
            <span className="text-xs font-semibold tabular-nums opacity-90">
              {event.amountLabel}
            </span>
          )}
          {showStatusBadge ? <EventStatusIcon event={event} /> : null}
        </div>
      </div>
      <div className="text-xs opacity-70">
        {event.allDay ? (
          <span>All day</span>
        ) : (
          <span className="uppercase">
            {formatTimeWithOptionalMinutes(displayStart)} -{" "}
            {formatTimeWithOptionalMinutes(displayEnd)}
          </span>
        )}
        {event.location && (
          <>
            <span className="px-1 opacity-35"> · </span>
            <span>{event.location}</span>
          </>
        )}
      </div>
      {(event.statusLine || event.description) && (
        <div className="text-xs opacity-90">
          {event.statusLine ?? event.description}
        </div>
      )}
    </button>
  )

  const agendaTooltip = [event.description, event.statusLine]
    .filter(Boolean)
    .join(" · ")

  return agendaTooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>{agendaContent}</TooltipTrigger>
      <TooltipContent>{agendaTooltip}</TooltipContent>
    </Tooltip>
  ) : (
    agendaContent
  )
}
