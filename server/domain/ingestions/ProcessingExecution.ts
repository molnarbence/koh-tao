export type ProcessingExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed'

export type ProcessingExecution = {
  id: string
  ingestionId: string
  stage: string
  status: ProcessingExecutionStatus
  startedAt?: Date
  endedAt?: Date
  errorSummary?: string
}
