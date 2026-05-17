import { expect, test } from 'bun:test'

test('manual upload route exists', async () => {
  expect(await Bun.file('server/api/ingestions/manual-uploads.post.ts').exists()).toBe(true)
})
