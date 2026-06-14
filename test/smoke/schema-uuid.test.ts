import { expect, test } from 'bun:test'

test('schema defines the Upload model without cuid ids', async () => {
  const schema = await Bun.file('prisma/schema.prisma').text()
  expect(schema.includes('model Upload')).toBe(true)
  expect(schema.includes('@default(cuid())')).toBe(false)
})
