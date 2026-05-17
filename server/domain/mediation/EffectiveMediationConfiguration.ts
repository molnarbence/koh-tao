export type ConfigurationSource = 'partner_default' | 'channel_override'

export type EffectiveMediationConfiguration = {
  ingestionId: string
  configurationSource: ConfigurationSource
  blueprintId: string
  functionIdentifier: string
  configurationVersionId: string
  parameters: Record<string, unknown>
}
