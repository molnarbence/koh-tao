import { getEffectiveMediationConfiguration } from '../../../../application/ingestions/GetEffectiveMediationConfiguration'

export default defineEventHandler(async (event) => {
  const ingestionId = getRouterParam(event, 'ingestionId')!
  return getEffectiveMediationConfiguration({ ingestionId })
})
