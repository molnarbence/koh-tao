// Raised when persisting the uploaded object to storage fails. Lets the API layer
// distinguish a genuine storage failure (502) from other errors such as a database
// outage (500), instead of mapping every failure to "storage failed".
export class StorageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StorageError'
  }
}
