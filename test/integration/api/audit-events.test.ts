import { expect, test } from 'bun:test'

test('audit route exists', async () => {
  expect(await Bun.file('server/api/audit-events/index.get.ts').exists()).toBe(true)
})
