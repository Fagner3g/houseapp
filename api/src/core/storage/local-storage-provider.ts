import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { env } from '@/config/env'

import type { StorageProvider } from './storage-provider'

export class LocalStorageProvider implements StorageProvider {
  private readonly basePath: string

  constructor(basePath = env.STORAGE_LOCAL_PATH) {
    this.basePath = basePath
  }

  private resolvePath(key: string): string {
    return join(this.basePath, key)
  }

  async put(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = this.resolvePath(key)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, buffer)
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key))
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolvePath(key))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error
      }
    }
  }
}
