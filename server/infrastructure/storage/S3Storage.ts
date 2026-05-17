export class S3Storage {
  async putObject(input: { key: string; body: ArrayBuffer }) {
    return { bucket: 'koh-tao-raw', key: input.key }
  }
}
