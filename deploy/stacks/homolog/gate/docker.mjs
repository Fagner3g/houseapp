import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const ALLOWED = new Set(
  (process.env.SCALE_SERVICES || 'houseapp-homolog_api,houseapp-homolog_web')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
)

function assertAllowed(name) {
  if (!ALLOWED.has(name)) {
    throw new Error(`Service not allowed: ${name}`)
  }
}

export async function getReplicas(service) {
  assertAllowed(service)
  const { stdout } = await execFileAsync('docker', [
    'service',
    'inspect',
    service,
    '--format',
    '{{.Spec.Mode.Replicated.Replicas}}',
  ])
  return Number.parseInt(stdout.trim(), 10) || 0
}

export async function scaleServices(replicas) {
  const args = ['service', 'scale']
  for (const name of ALLOWED) {
    args.push(`${name}=${replicas}`)
  }
  await execFileAsync('docker', args)
}

export async function areAllUp() {
  for (const name of ALLOWED) {
    if ((await getReplicas(name)) < 1) return false
  }
  return true
}

export { ALLOWED }
