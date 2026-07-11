const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
}

export function formatNotifyDays(days: number[]): string {
  return [...days]
    .sort((a, b) => a - b)
    .map(day => (day === 0 ? 'no dia' : `${day}d`))
    .join(', ')
}

export function formatOverdueSchedule(
  frequency: 'daily' | 'weekly' | 'monthly',
  interval: number
): string {
  const label = FREQUENCY_LABELS[frequency] ?? frequency
  return interval === 1 ? label : `${label}, intervalo ${interval}`
}
