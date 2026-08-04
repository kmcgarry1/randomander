import { execFileSync } from 'node:child_process'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { resolve, sep } from 'node:path'

const patterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{36,}/g],
  ['AWS access key', /AKIA[0-9A-Z]{16}/g],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/g],
  ['Slack token', /xox[baprs]-[0-9A-Za-z-]{20,}/g],
  ['Vercel token assignment', /VERCEL_TOKEN\s*[=:]\s*["'][^"']{16,}["']/gi],
]

const matches = []
const inspectContent = (sourceName, content) => {
  for (const [patternName, pattern] of patterns) {
    pattern.lastIndex = 0
    if (pattern.test(content)) matches.push(`${patternName} in ${sourceName}`)
  }
}

const workspaceRoot = resolve(process.cwd())
const workspacePrefix = `${workspaceRoot}${sep}`
const filenames = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
)
  .split('\0')
  .filter(Boolean)

for (const filename of filenames) {
  const absolutePath = resolve(workspaceRoot, filename)
  if (!absolutePath.startsWith(workspacePrefix)) {
    throw new Error(`Refusing to inspect a path outside the repository: ${filename}`)
  }
  if (!existsSync(absolutePath)) continue
  const stat = lstatSync(absolutePath)
  if (!stat.isFile() || stat.isSymbolicLink()) continue
  const body = readFileSync(absolutePath)
  if (body.includes(0)) continue
  inspectContent('working tree', body.toString('utf8'))
}

inspectContent(
  'Git history',
  execFileSync('git', ['log', '--all', '-p', '--format='], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  }),
)

if (matches.length) {
  process.stderr.write(
    `Potential secrets detected (values withheld):\n${matches
      .map((match) => `- ${match}`)
      .join('\n')}\n`
  )
  process.exitCode = 1
} else {
  process.stdout.write(
    `Complete non-ignored working tree (${filenames.length} files) and Git history passed the secret-pattern baseline.\n`,
  )
}
