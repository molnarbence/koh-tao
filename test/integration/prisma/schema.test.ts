import { beforeAll, expect, test } from 'bun:test'
import { GenericContainer, Wait } from 'testcontainers'

let databaseUrl = ''

beforeAll(async () => {
  const container = await new GenericContainer('postgres:18')
    .withEnvironment({ POSTGRES_PASSWORD: 'test', POSTGRES_USER: 'test', POSTGRES_DB: 'test' })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage(/database system is ready to accept connections/, 1))
    .start()

  const host = container.getHost()
  const port = container.getMappedPort(5432)
  databaseUrl = `postgresql://test:test@${host}:${port}/test`
}, 120000)

test('prisma schema contains the ingestion and mediation core models', async () => {
  const schema = await Bun.file('prisma/schema.prisma').text()
  expect(schema.includes('model Ingestion')).toBe(true)
  expect(schema.includes('model IngestionChannel')).toBe(true)
  expect(schema.includes('model MediationBlueprint')).toBe(true)
  expect(databaseUrl.startsWith('postgresql://')).toBe(true)
})
