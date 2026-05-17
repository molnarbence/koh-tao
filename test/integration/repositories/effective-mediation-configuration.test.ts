import { expect, test } from 'bun:test'
import { getEffectiveMediationConfiguration } from '../../../server/application/ingestions/GetEffectiveMediationConfiguration'

test('channel override wins over partner default', async () => {
  const result = await getEffectiveMediationConfiguration({ ingestionId: 'ing_123' })
  expect(result.configurationSource).toBe('channel_override')
})
