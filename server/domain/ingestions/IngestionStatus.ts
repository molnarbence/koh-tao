export const INGESTION_STATUSES = [
  'waiting_for_mediation',
  'mediation_started',
  'mediation_failed',
  'data_quality_validation_failed',
  'skipped',
  'uploaded_to_billing_system',
  'ingested_by_billing_system',
  'billing_system_failed_to_process'
] as const

export type IngestionStatus = (typeof INGESTION_STATUSES)[number]

const rank: Record<IngestionStatus, number> = {
  waiting_for_mediation: 1,
  mediation_started: 2,
  mediation_failed: 3,
  data_quality_validation_failed: 3,
  skipped: 3,
  uploaded_to_billing_system: 4,
  ingested_by_billing_system: 5,
  billing_system_failed_to_process: 5
}

export const isRegressiveStatus = (current: IngestionStatus, next: IngestionStatus) => rank[next] < rank[current]
