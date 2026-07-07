import { badRequest } from '@/core/errors'

import type { StorageProvider } from './storage-provider'

/**
 * S3-compatible storage stub.
 * Install @aws-sdk/client-s3 and implement put/get/delete/getSignedUrl for production.
 */
export class S3StorageProvider implements StorageProvider {
  async put(_key: string, _buffer: Buffer, _contentType: string): Promise<void> {
    throw badRequest('S3 storage provider is not implemented yet — set STORAGE_DRIVER=local for dev')
  }

  async get(_key: string): Promise<Buffer> {
    throw badRequest('S3 storage provider is not implemented yet — set STORAGE_DRIVER=local for dev')
  }

  async delete(_key: string): Promise<void> {
    throw badRequest('S3 storage provider is not implemented yet — set STORAGE_DRIVER=local for dev')
  }

  async getSignedUrl(_key: string, _expiresInSeconds = 3600): Promise<string> {
    throw badRequest('S3 storage provider is not implemented yet — set STORAGE_DRIVER=local for dev')
  }
}
