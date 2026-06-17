import { expect, test } from 'bun:test'

test('.env.example documents required environment variables', async () => {
  const content = await Bun.file('.env.example').text()
  expect(content.includes('DATABASE_URL')).toBe(true)
  expect(content.includes('NUXT_S3_BUCKET')).toBe(true)
  expect(content.includes('NUXT_S3_PREFIX')).toBe(true)
  expect(content.includes('NUXT_S3_ENDPOINT')).toBe(true)
})
