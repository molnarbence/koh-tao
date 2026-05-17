import { createManualUpload } from '../../application/ingestions/CreateManualUpload'

export default defineEventHandler(async () => {
  return createManualUpload({
    ingestionId: 'ing_manual_1',
    filename: 'usage.xlsx',
    file: new ArrayBuffer(0)
  })
})
