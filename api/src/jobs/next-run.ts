const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function parseCronField(value: string, max: number, min = 0): Set<number> {
  const result = new Set<number>()
  if (value === '*') {
    for (let i = min; i <= max; i++) result.add(i)
    return result
  }
  const parts = value.split(',')
  for (const part of parts) {
    if (part.includes('/')) {
      const [range, stepStr] = part.split('/')
      const step = Number(stepStr)
      const [start, end] = range === '*' ? [min, max] : range.split('-').map(Number)
      for (let i = start; i <= (end ?? max); i += step) result.add(i)
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      for (let i = start; i <= end; i++) result.add(i)
    } else {
      result.add(Number(part))
    }
  }
  return result
}

export function computeNextRun(schedule: string, timezone = 'America/Sao_Paulo'): string {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.split(' ')
  if (!minute || !hour || !dayOfMonth || !month || !dayOfWeek) return 'Indisponível'

  const minutes = parseCronField(minute, 59)
  const hours = parseCronField(hour, 23)
  const daysOfMonth = parseCronField(dayOfMonth, 31, 1)
  const months = parseCronField(month, 12, 1)
  const daysOfWeek = parseCronField(dayOfWeek, 6) // 0=domingo

  const now = new Date()
  const offset = timezone === 'America/Sao_Paulo' ? -3 : 0
  const localNow = new Date(now.getTime() + offset * 60 * 60 * 1000)

  const candidate = new Date(localNow)
  candidate.setSeconds(0, 0)

  for (let daysAhead = 0; daysAhead < 366; daysAhead++) {
    const m = candidate.getMonth() + 1
    const d = candidate.getDate()
    const w = candidate.getDay()

    if (!months.has(m)) {
      candidate.setDate(candidate.getDate() + 1)
      continue
    }

    if (dayOfMonth !== '*' && dayOfWeek !== '*' && !(daysOfMonth.has(d) || daysOfWeek.has(w))) {
      candidate.setDate(candidate.getDate() + 1)
      continue
    }
    if (dayOfMonth !== '*' && dayOfWeek === '*' && !daysOfMonth.has(d)) {
      candidate.setDate(candidate.getDate() + 1)
      continue
    }
    if (dayOfMonth === '*' && dayOfWeek !== '*' && !daysOfWeek.has(w)) {
      candidate.setDate(candidate.getDate() + 1)
      continue
    }

    for (const h of Array.from(hours).sort((a, b) => a - b)) {
      for (const min of Array.from(minutes).sort((a, b) => a - b)) {
        const target = new Date(candidate)
        target.setHours(h, min, 0, 0)
        if (target > localNow) {
          return target.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        }
      }
    }

    candidate.setDate(candidate.getDate() + 1)
  }

  return 'Indisponível'
}

export function humanizeSchedule(schedule: string, _timezone?: string): string {
  const parts = schedule.split(' ')
  if (parts.length < 5) return schedule

  const [minute, hour, , , dayOfWeek] = parts as [string, string, string, string, string]

  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`

  if (dayOfWeek !== '*') {
    const dayIndex = Number(dayOfWeek)
    const dayName = DAYS[dayIndex]
    if (dayName && !Number.isNaN(dayIndex)) return `Toda ${dayName}-feira às ${time}`
  }

  const dayNum = Number(parts[2])
  if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 28) {
    return `Todo dia ${dayNum} às ${time}`
  }

  return `Diariamente às ${time}`
}
