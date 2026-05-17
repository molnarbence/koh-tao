import { expect, test } from 'bun:test'

test('partner channel configuration page exists', async () => {
  expect(await Bun.file('pages/partners/[partnerId]/channels.vue').exists()).toBe(true)
})
