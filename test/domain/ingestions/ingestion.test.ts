import { expect, test } from 'bun:test'
import { Ingestion } from '../../../server/domain/ingestions/Ingestion'

test('new ingestions start in waiting_for_mediation', () => {
  const ingestion = Ingestion.create({
    id: 'ing_1',
    partnerId: 'par_1',
    ingestionChannelId: 'chn_1',
    billingPeriod: '2026-05',
    sourceType: 'manual_upload',
    originalFilename: 'usage.xlsx'
  })

  expect(ingestion.status).toBe('waiting_for_mediation')
})

test('regressive machine updates are rejected', () => {
  const ingestion = Ingestion.create({
    id: 'ing_2',
    partnerId: 'par_1',
    ingestionChannelId: 'chn_1',
    billingPeriod: '2026-05',
    sourceType: 'sftp',
    originalFilename: 'usage.csv'
  })

  ingestion.applyProcessingStatus('uploaded_to_billing_system')

  expect(() => ingestion.applyProcessingStatus('mediation_started')).toThrow('Regressive status update')
})
