interface ExecutionEntry {
  timestamp: Date
  success: boolean
  processed: number
  errors: number
  duration: number
}

const MAX_LOG_SIZE = 50
const logs = new Map<string, ExecutionEntry[]>()

export function logExecution(
  jobKey: string,
  result: { success: boolean; processed: number; errors: number; duration: number }
): void {
  const entries = logs.get(jobKey) ?? []
  entries.unshift({ timestamp: new Date(), ...result })
  if (entries.length > MAX_LOG_SIZE) entries.length = MAX_LOG_SIZE
  logs.set(jobKey, entries)
}

export function getExecutionHistory(jobKey: string, limit = 10): ExecutionEntry[] {
  return (logs.get(jobKey) ?? []).slice(0, limit)
}

export function getLastExecution(jobKey: string): ExecutionEntry | null {
  const history = logs.get(jobKey)
  return history?.[0] ?? null
}
