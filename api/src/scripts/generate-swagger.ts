import { writeFile } from 'node:fs/promises'

import { buildServer } from '@/http/utils/setup'

async function main() {
  const app = await buildServer()
  await app.ready()
  await writeFile('swagger.json', JSON.stringify(app.swagger(), null, 2))
  console.log('swagger generated')
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
