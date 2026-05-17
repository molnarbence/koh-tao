import { expect, test } from 'bun:test'

test('internal machine routes exist for ingestion creation and effective mediation reads', async () => {
  expect(await Bun.file('server/api/internal/ingestions/index.post.ts').exists()).toBe(true)
  expect(await Bun.file('server/api/internal/ingestions/[ingestionId]/effective-mediation-configuration.get.ts').exists()).toBe(true)
})
