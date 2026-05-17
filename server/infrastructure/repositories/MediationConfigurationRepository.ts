export class MediationConfigurationRepository {
  async findEffectiveConfigurationForIngestion(ingestionId: string) {
    return {
      ingestionId,
      configurationSource: 'channel_override' as const,
      blueprintId: 'bp_override',
      functionIdentifier: 'normalize_usage_csv',
      configurationVersionId: 'cfg_override_1',
      parameters: { delimiter: ',', timezone: 'UTC' }
    }
  }
}
