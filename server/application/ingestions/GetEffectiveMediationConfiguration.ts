import { MediationConfigurationRepository } from '../../infrastructure/repositories/MediationConfigurationRepository'

export async function getEffectiveMediationConfiguration(input: { ingestionId: string }) {
  const repository = new MediationConfigurationRepository()
  const configuration = await repository.findEffectiveConfigurationForIngestion(input.ingestionId)

  if (!configuration) {
    throw new Error('Effective mediation configuration not found')
  }

  return configuration
}
