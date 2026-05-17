import { expect, test } from 'bun:test'

test('partner channel and mediation configuration routes exist', async () => {
  expect(await Bun.file('server/api/partners/[partnerId]/channels.get.ts').exists()).toBe(true)
  expect(await Bun.file('server/api/partners/[partnerId]/channels/[channelId]/activation-state.put.ts').exists()).toBe(true)
  expect(await Bun.file('server/api/partners/[partnerId]/mediation-configuration.put.ts').exists()).toBe(true)
})
