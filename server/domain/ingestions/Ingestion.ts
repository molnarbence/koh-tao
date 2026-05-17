import { IngestionStatus, isRegressiveStatus } from './IngestionStatus'

type CreateIngestionInput = {
  id: string
  partnerId: string
  ingestionChannelId: string
  billingPeriod: string
  sourceType: string
  originalFilename: string
}

export class Ingestion {
  private constructor(
    readonly id: string,
    readonly partnerId: string,
    readonly ingestionChannelId: string,
    readonly billingPeriod: string,
    readonly sourceType: string,
    readonly originalFilename: string,
    public status: IngestionStatus
  ) {}

  static create(input: CreateIngestionInput) {
    return new Ingestion(
      input.id,
      input.partnerId,
      input.ingestionChannelId,
      input.billingPeriod,
      input.sourceType,
      input.originalFilename,
      'waiting_for_mediation'
    )
  }

  applyProcessingStatus(next: IngestionStatus) {
    if (isRegressiveStatus(this.status, next)) {
      throw new Error('Regressive status update')
    }

    this.status = next
  }
}
