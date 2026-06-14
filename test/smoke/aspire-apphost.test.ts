import { expect, test } from 'bun:test'

test('aspire apphost and config files exist', async () => {
  expect(await Bun.file('apphost.cs').exists()).toBe(true)
  expect(await Bun.file('aspire.config.json').exists()).toBe(true)
})

test('apphost registers postgres, localstack, and the nuxt app', async () => {
  const content = await Bun.file('apphost.cs').text()
  expect(content.includes('AddPostgres')).toBe(true)
  expect(content.includes('"koh-tao-dev"')).toBe(true)
  expect(content.includes('AddBunApp("koh-tao"')).toBe(true)
  expect(content.includes('AddContainer("localstack"')).toBe(true)
  expect(content.includes('WaitFor')).toBe(true)
})
