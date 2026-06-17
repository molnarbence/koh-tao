export const UPLOAD_STATUSES = ['pending', 'stored', 'failed'] as const

export type UploadStatus = (typeof UPLOAD_STATUSES)[number]

const ALLOWED_TRANSITIONS: Record<UploadStatus, UploadStatus[]> = {
  pending: ['stored', 'failed'],
  stored: [],
  failed: []
}

export function assertTransition(current: UploadStatus, next: UploadStatus) {
  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    throw new Error(`Invalid status transition: ${current} -> ${next}`)
  }
}
