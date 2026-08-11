import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const distRoot = resolve(projectRoot, 'dist')

if (!existsSync(distRoot) || !statSync(distRoot).isDirectory()) {
  throw new Error('Production policy check requires a completed dist build.')
}

const inspectedExtensions = new Set(['.css', '.html', '.js', '.mjs'])
const forbiddenPatterns = [
  {
    label: 'automated EDHREC JSON endpoint',
    pattern: /json\.edhrec\.com/i,
  },
  {
    label: 'Google Fonts stylesheet host',
    pattern: /fonts\.googleapis\.com/i,
  },
  {
    label: 'Google Fonts asset host',
    pattern: /fonts\.gstatic\.com/i,
  },
  {
    label: 'Vercel Analytics debug host',
    pattern: /va\.vercel-scripts\.com/i,
  },
  {
    label: 'Vercel Analytics collection host',
    pattern: /vitals\.vercel-insights\.com/i,
  },
  {
    label: 'Vercel Analytics injection endpoint',
    pattern: /_vercel\/insights/i,
  },
]

const files = []
const visit = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) visit(path)
    else if (entry.isFile() && inspectedExtensions.has(extname(entry.name))) {
      files.push(path)
    }
  }
}
visit(distRoot)

if (files.length === 0) {
  throw new Error('Production policy check found no built HTML, CSS, or JavaScript.')
}

for (const path of files) {
  const contents = readFileSync(path, 'utf8')
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(contents)) {
      throw new Error(
        `Production output contains the disabled ${forbidden.label} in ${path.slice(projectRoot.length + 1)}.`
      )
    }
  }
}

const indexPath = resolve(distRoot, 'index.html')
const privacyPath = resolve(distRoot, 'privacy.html')
if (!existsSync(indexPath) || !existsSync(privacyPath)) {
  throw new Error('Production output must include index.html and privacy.html.')
}

process.stdout.write(
  `Production policy passed across ${files.length} built text assets.\n`
)
