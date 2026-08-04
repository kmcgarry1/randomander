import { readFileSync } from 'node:fs'

const lock = JSON.parse(readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'))
const packages = Object.entries(lock.packages ?? {})
  .filter(([path]) => path.startsWith('node_modules/'))
  .map(([path, metadata]) => ({
    name: path.slice('node_modules/'.length),
    version: metadata.version ?? null,
    license: metadata.license ?? 'UNKNOWN',
    development: metadata.dev === true,
    optional: metadata.optional === true,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const unknown = packages.filter((entry) => entry.license === 'UNKNOWN')
if (unknown.length > 0) {
  process.stderr.write(
    `Packages missing license metadata: ${unknown.map((entry) => entry.name).join(', ')}\n`
  )
  process.exitCode = 1
}

process.stdout.write(
  `${JSON.stringify(
    {
      schemaVersion: 1,
      generatedFrom: 'package-lock.json',
      packageCount: packages.length,
      packages,
    },
    null,
    2
  )}\n`
)
