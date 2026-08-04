import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)
const packageLock = JSON.parse(
  readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')
)
const tag = process.env.GITHUB_REF_NAME ?? process.argv[2]

if (!tag) throw new Error('Provide a release tag such as v1.0.0.')
if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  throw new Error(`Release tag must be stable SemVer (received ${tag}).`)
}
if (tag !== `v${packageJson.version}`) {
  throw new Error(`Tag ${tag} does not match package version ${packageJson.version}.`)
}
if (
  packageLock.version !== packageJson.version ||
  packageLock.packages?.['']?.version !== packageJson.version
) {
  throw new Error('package.json and package-lock.json versions do not agree.')
}
if (!packageJson.license || packageJson.license === 'UNLICENSED') {
  throw new Error('package.json must name the owner-approved project license.')
}

try {
  readFileSync(new URL('../LICENSE', import.meta.url), 'utf8')
} catch {
  throw new Error('The owner-approved LICENSE file is missing.')
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8')
if (!changelog.includes(`## [${packageJson.version}]`)) {
  throw new Error(`CHANGELOG.md has no section for ${packageJson.version}.`)
}

process.stdout.write(`Release metadata matches ${tag}.\n`)
