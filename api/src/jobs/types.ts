export interface JobConfig {
  key: string
  schedule: string
  timezone: string
  description: string
}

export interface JobResult {
  success: boolean
  processed: number
  errors: number
  duration: number
}

export interface JobContext {
  startTime: Date
  endTime?: Date
  errors: Error[]
  processed: number
}

export type JobFunction = (userId?: string) => Promise<JobResult>
