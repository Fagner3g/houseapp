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
  getBorderRadiusClasses,
  getEventColorClasses,
} from "@/components/event-calendar"
import type { CalendarEvent } from "@/components/event-calendar"
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
}: EventWrapperProps) {
  const isPaid = event.status === "paid"

  return (
    <button
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 flex size-full overflow-hidden px-1 text-left font-medium backdrop-blur-md transition outline-none select-none focus-visible:ring-[3px] data-dragging:cursor-grabbing data-dragging:shadow-lg data-paid:line-through sm:px-2",
        getEventColorClasses(event.color),
        getBorderRadiusClasses(isFirstDay, isLastDay),
        className
      )}
      data-dragging={isDragging || undefined}
      data-paid={isPaid || undefined}
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

  const overdueBadge =
    event.status !== "paid" && event.overdueDays && event.overdueDays > 0 ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="ml-1 size-2 rounded-full bg-destructive" />
        </TooltipTrigger>
        <TooltipContent>{`${event.overdueDays} dias em atraso`}</TooltipContent>
      </Tooltip>
    ) : null

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
        className={cn(
          "mt-[var(--event-gap)] h-[var(--event-height)] items-center text-[10px] sm:text-xs",
          className
        )}
        dndListeners={dndListeners}
        dndAttributes={dndAttributes}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        {children || (
          <div className="flex w-full items-center justify-between gap-1">
            <span className="truncate">
              {!event.allDay && (
                <span className="truncate font-normal opacity-70 sm:text-[11px]">
                  {formatTimeWithOptionalMinutes(displayStart)}{" "}
                </span>
              )}
              {event.title}
            </span>
            {overdueBadge}
          </div>
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
            <span className="truncate">
              {event.title}{" "}
              {showTime && (
                <span className="opacity-70">
                  {formatTimeWithOptionalMinutes(displayStart)}
                </span>
              )}
            </span>
            {overdueBadge}
          </div>
        ) : (
          <>
            <div className="flex w-full items-center justify-between">
              <div className="truncate font-medium">{event.title}</div>
              {overdueBadge}
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
        "focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-col gap-1 rounded p-2 text-left transition outline-none focus-visible:ring-[3px] data-paid:line-through data-past-event:opacity-90",
        getEventColorClasses(eventColor),
        className
      )}
      data-past-event={isPast(new Date(event.end)) || undefined}
      data-paid={event.status === "paid" || undefined}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      {...dndListeners}
      {...dndAttributes}
    >
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{event.title}</span>
        {overdueBadge}
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
      {event.description && (
        <div className="my-1 text-xs opacity-90">{event.description}</div>
      )}
    </button>
  )

  return event.description ? (
    <Tooltip>
      <TooltipTrigger asChild>{agendaContent}</TooltipTrigger>
      <TooltipContent>{event.description}</TooltipContent>
    </Tooltip>
  ) : (
    agendaContent
  )
}
