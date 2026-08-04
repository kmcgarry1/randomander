const target = process.argv[2] ?? process.env.PRODUCTION_URL

if (!target) {
  throw new Error('Usage: npm run smoke:deployment -- https://deployment.example')
}

const baseUrl = new URL(target)
if (baseUrl.protocol !== 'https:') {
  throw new Error('Deployment smoke targets must use HTTPS.')
}
if (baseUrl.username || baseUrl.password) {
  throw new Error('Deployment smoke targets cannot contain credentials.')
}
baseUrl.pathname = '/'
baseUrl.search = ''
baseUrl.hash = ''

const requiredHeaders = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
]

const parseDirectives = (value) =>
  new Map(
    value
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...tokens] = part.split(/\s+/)
        return [name, tokens]
      }),
  )

const requireDirectiveTokens = (directives, name, expected) => {
  const actual = directives.get(name)
  if (!actual) throw new Error(`CSP is missing ${name}.`)
  for (const token of expected) {
    if (!actual.includes(token)) {
      throw new Error(`CSP ${name} is missing ${token}.`)
    }
  }
}

const insecureUrl = new URL(baseUrl)
insecureUrl.protocol = 'http:'
const redirectResponse = await fetch(insecureUrl, { redirect: 'manual' })
if (![301, 302, 307, 308].includes(redirectResponse.status)) {
  throw new Error(`HTTP did not redirect to HTTPS (received ${redirectResponse.status}).`)
}
const redirectLocation = redirectResponse.headers.get('location')
if (!redirectLocation || new URL(redirectLocation, insecureUrl).protocol !== 'https:') {
  throw new Error('HTTP redirect target is not HTTPS.')
}

const response = await fetch(baseUrl, { redirect: 'follow' })
if (!response.ok) throw new Error(`Root returned HTTP ${response.status}.`)
if (new URL(response.url).protocol !== 'https:') {
  throw new Error('The final application response is not HTTPS.')
}
if (!/^text\/html\b/i.test(response.headers.get('content-type') ?? '')) {
  throw new Error('Root response is not HTML.')
}
const html = await response.text()
if (!html.includes('<title>Randomander')) {
  throw new Error('Root response is not the Randomander application shell.')
}

const missingHeaders = requiredHeaders.filter((header) => !response.headers.has(header))
if (missingHeaders.length) {
  throw new Error(`Missing security headers: ${missingHeaders.join(', ')}`)
}

const csp = response.headers.get('content-security-policy') ?? ''
const directives = parseDirectives(csp)
requireDirectiveTokens(directives, 'default-src', ["'self'"])
requireDirectiveTokens(directives, 'base-uri', ["'self'"])
requireDirectiveTokens(directives, 'object-src', ["'none'"])
requireDirectiveTokens(directives, 'frame-ancestors', ["'none'"])
requireDirectiveTokens(directives, 'form-action', ["'self'"])
requireDirectiveTokens(directives, 'script-src', [
  "'self'",
  'https://va.vercel-scripts.com',
])
requireDirectiveTokens(directives, 'img-src', [
  "'self'",
  'data:',
  'https://cards.scryfall.io',
  'https://svgs.scryfall.io',
])
requireDirectiveTokens(directives, 'connect-src', [
  "'self'",
  'https://api.scryfall.com',
  'https://json.edhrec.com',
  'https://vitals.vercel-insights.com',
])
if (!directives.has('upgrade-insecure-requests')) {
  throw new Error('CSP is missing upgrade-insecure-requests.')
}
if (/\*|\bhttp:\/\//i.test(csp)) {
  throw new Error('CSP contains a wildcard or insecure HTTP source.')
}

const hsts = response.headers.get('strict-transport-security') ?? ''
const hstsAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0)
if (hstsAge < 31_536_000 || !/includeSubDomains/i.test(hsts)) {
  throw new Error('HSTS must cover at least one year and include subdomains.')
}
if (response.headers.get('x-content-type-options')?.toLowerCase() !== 'nosniff') {
  throw new Error('X-Content-Type-Options must be nosniff.')
}
if (response.headers.get('x-frame-options')?.toUpperCase() !== 'DENY') {
  throw new Error('X-Frame-Options must be DENY.')
}
if (response.headers.get('referrer-policy') !== 'strict-origin-when-cross-origin') {
  throw new Error('Referrer-Policy does not match the deployment policy.')
}
if (response.headers.get('cross-origin-opener-policy') !== 'same-origin') {
  throw new Error('Cross-Origin-Opener-Policy must be same-origin.')
}
const permissionsPolicy = response.headers.get('permissions-policy') ?? ''
for (const feature of ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()', 'usb=()']) {
  if (!permissionsPolicy.includes(feature)) {
    throw new Error(`Permissions-Policy is missing ${feature}.`)
  }
}
if (!/max-age=0|no-cache|no-store/i.test(response.headers.get('cache-control') ?? '')) {
  throw new Error('HTML must be revalidated rather than cached as immutable.')
}

const assetPath = html.match(
  /(?:src|href)="([^"]*\/assets\/[^"]+-[A-Za-z0-9_-]{6,}\.(?:js|css))"/,
)?.[1]
if (!assetPath) throw new Error('No hashed production asset was found in HTML.')
const assetResponse = await fetch(new URL(assetPath, response.url), { method: 'HEAD' })
if (!assetResponse.ok) throw new Error(`Asset returned HTTP ${assetResponse.status}.`)
const assetCache = assetResponse.headers.get('cache-control') ?? ''
const assetMaxAge = Number(assetCache.match(/max-age=(\d+)/i)?.[1] ?? 0)
if (!/immutable/i.test(assetCache) || assetMaxAge < 31_536_000) {
  throw new Error('Hashed assets must use immutable caching.')
}

const privacyResponse = await fetch(new URL('/privacy.html', response.url))
if (!privacyResponse.ok) {
  throw new Error(`Privacy notice returned HTTP ${privacyResponse.status}.`)
}
if (!/^text\/html\b/i.test(privacyResponse.headers.get('content-type') ?? '')) {
  throw new Error('Privacy notice is not served as HTML.')
}
const privacyHtml = await privacyResponse.text()
if (!/Randomander privacy/i.test(privacyHtml)) {
  throw new Error('Privacy notice content could not be identified.')
}

process.stdout.write(`Deployment smoke passed for ${baseUrl.origin}\n`)
