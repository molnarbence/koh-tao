export async function updateChannelActivationState(input: { channelId: string; isActive: boolean }) {
  return { id: input.channelId, isActive: input.isActive }
}
