export async function listPartnerChannels(input: { partnerId: string }) {
  return {
    items: [{ id: 'chn_1', channelType: 'manual_upload', isActive: true }]
  }
}
