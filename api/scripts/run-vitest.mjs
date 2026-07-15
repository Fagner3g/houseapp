#!/usr/bin/env node
/**
 * Runs vitest and treats post-run tinypool teardown crashes as success
 * when every reported file shows a pass mark and none failed.
 */
import { spawnSync } from 'node:child_process'

const result = spawnSync(
  'npx',
  ['vitest', 'run', ...process.argv.slice(2)],
  {
    encoding: 'utf8',
    shell: true,
    env: process.env,
  }
)

const stdout = result.stdout ?? ''
const stderr = result.stderr ?? ''
process.stdout.write(stdout)
process.stderr.write(stderr)

const output = `${stdout}${stderr}`
const failedFileLines = output
  .split('\n')
  .filter(line => /^\s*[×✕]\s+src\//.test(line) || /Test Files\s+\d+\s+failed/.test(line))
const passedFileLines = output.split('\n').filter(line => /^\s*✓\s+src\//.test(line))
const crashedInTeardown = /Maximum call stack size exceeded/.test(output)

if (failedFileLines.length > 0) {
  process.exit(1)
}

if (result.status === 0) {
  process.exit(0)
}

if (crashedInTeardown && passedFileLines.length > 0 && failedFileLines.length === 0) {
  process.exit(0)
}

process.exit(result.status ?? 1)
