const TIMEZONE = 'America/Sao_Paulo'

function getCurrentTimeInTimezone(now: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now)

  return {
    hour: Number(parts.find(part => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find(part => part.type === 'minute')?.value ?? 0),
  }
}

function formatTimeLabel(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export function formatNextNotifyRun(
  hour: number,
  minute: number,
  now = new Date()
): string {
  const current = getCurrentTimeInTimezone(now)
  const currentMinutes = current.hour * 60 + current.minute
  const scheduledMinutes = hour * 60 + minute
  const label = formatTimeLabel(hour, minute)

  if (currentMinutes < scheduledMinutes) {
    return `Próximos alertas automáticos: hoje às ${label}`
  }

  return `Próximos alertas automáticos: amanhã às ${label}`
}
