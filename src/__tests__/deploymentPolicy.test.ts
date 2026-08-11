import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type HeaderRule = {
  source: string
  headers: Array<{ key: string; value: string }>
}

type VercelConfig = {
  framework?: string
  buildCommand?: string
  outputDirectory?: string
  headers?: HeaderRule[]
}

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')
) as VercelConfig

const headersFor = (source: string) =>
  Object.fromEntries(
    (config.headers?.find((rule) => rule.source === source)?.headers ?? []).map(
      ({ key, value }) => [key.toLowerCase(), value]
    )
  )

const parseCsp = (value: string) =>
  Object.fromEntries(
    value
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [name, ...tokens] = part.split(/\s+/)
        return [name, tokens]
      })
  )

describe('production deployment policy', () => {
  it('uses the declared Vite build and output contract', () => {
    expect(config).toMatchObject({
      framework: 'vite',
      buildCommand: 'npm run build',
      outputDirectory: 'dist',
    })
  })

  it('sets defensive root headers and a narrowly scoped CSP', () => {
    const headers = headersFor('/(.*)')
    expect(headers['strict-transport-security']).toMatch(
      /^max-age=63072000; includeSubDomains; preload$/
    )
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['x-frame-options']).toBe('DENY')
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['cross-origin-opener-policy']).toBe('same-origin')
    expect(headers['permissions-policy']).toContain('camera=()')
    expect(headers['permissions-policy']).toContain('microphone=()')

    const cspValue = headers['content-security-policy'] ?? ''
    const csp = parseCsp(cspValue)
    expect(csp['default-src']).toEqual(["'self'"])
    expect(csp['base-uri']).toEqual(["'self'"])
    expect(csp['object-src']).toEqual(["'none'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['form-action']).toEqual(["'self'"])
    expect(csp['script-src']).toEqual(["'self'"])
    expect(csp['img-src']).toEqual([
      "'self'",
      'data:',
      'https://cards.scryfall.io',
      'https://svgs.scryfall.io',
    ])
    expect(csp['connect-src']).toEqual([
      "'self'",
      'https://api.scryfall.com',
    ])
    expect(csp['upgrade-insecure-requests']).toEqual([])
    expect(cspValue).not.toMatch(/\*|\bhttp:\/\//i)

    const externalOrigins = Array.from(
      new Set(cspValue.match(/https:\/\/[^\s;]+/g) ?? [])
    ).sort()
    expect(externalOrigins).toEqual(
      [
        'https://api.scryfall.com',
        'https://cards.scryfall.io',
        'https://svgs.scryfall.io',
      ].sort()
    )
    expect(cspValue).not.toMatch(
      /json\.edhrec\.com|va\.vercel-scripts\.com|vitals\.vercel-insights\.com/
    )
  })

  it('revalidates HTML and makes hashed assets immutable', () => {
    expect(headersFor('/(.*)')['cache-control']).toMatch(/max-age=0/)
    expect(headersFor('/assets/(.*)')['cache-control']).toBe(
      'public, max-age=31536000, immutable'
    )
  })
})
