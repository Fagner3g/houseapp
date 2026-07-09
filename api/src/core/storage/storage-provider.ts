export interface StorageProvider {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>
  get(key: string): Promise<Buffer>
  delete(key: string): Promise<void>
  getSignedUrl?(key: string, expiresInSeconds?: number): Promise<string>
}
