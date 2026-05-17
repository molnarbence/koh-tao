import { expect, test } from 'bun:test'

test('.env.example documents required environment variables', async () => {
  const content = await Bun.file('.env.example').text()
  expect(content.includes('DATABASE_URL')).toBe(true)
  expect(content.includes('AUTH0_DOMAIN')).toBe(true)
  expect(content.includes('AUTH0_CLIENT_ID')).toBe(true)
})
