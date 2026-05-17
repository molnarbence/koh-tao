import { expect, test } from 'bun:test'

test('schema uses uuid7 for all model ids, not cuid', async () => {
  const schema = await Bun.file('prisma/schema.prisma').text()
  expect(schema.includes('@default(cuid())')).toBe(false)
  expect(schema.includes('@default(uuid(7))')).toBe(true)
})
