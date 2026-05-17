import { expect, test } from 'bun:test'

test('aspire apphost and config files exist', async () => {
  expect(await Bun.file('apphost.cs').exists()).toBe(true)
  expect(await Bun.file('aspire.config.json').exists()).toBe(true)
})
