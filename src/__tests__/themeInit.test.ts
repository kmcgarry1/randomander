import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const themeInitScript = readFileSync(
  resolve(process.cwd(), 'public/theme-init.js'),
  'utf8'
)

const runThemeInit = () => Function(themeInitScript)()

const setPreferencesTheme = (theme: unknown) => {
  localStorage.setItem(
    'randomander:state:v3:preferences',
    JSON.stringify({
      schema: 'randomander-partition',
      version: 1,
      partition: 'preferences',
      revision: { counter: 1, writer: 'test' },
      value: { theme },
    })
  )
}

describe('prepaint theme bootstrap', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.head.innerHTML = '<meta name="theme-color" content="#fff8fb">'
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false }))
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the v3 preferences envelope ahead of stale legacy state', () => {
    setPreferencesTheme('dark')
    localStorage.setItem(
      'randomander:state:v2',
      JSON.stringify({ theme: 'light' })
    )

    runThemeInit()

    expect(document.documentElement).toHaveClass('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#151218'
    )
  })

  it('keeps legacy v2 as a migration fallback', () => {
    localStorage.setItem(
      'randomander:state:v2',
      JSON.stringify({ theme: 'dark' })
    )

    runThemeInit()

    expect(document.documentElement).toHaveClass('dark')
  })

  it('falls back safely when a v3 envelope is malformed', () => {
    localStorage.setItem('randomander:state:v3:preferences', '{not-json')
    localStorage.setItem(
      'randomander:state:v2',
      JSON.stringify({ theme: 'light' })
    )
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    )

    runThemeInit()

    expect(document.documentElement).not.toHaveClass('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute(
      'content',
      '#fff8fb'
    )
  })

  it('uses the system preference when neither schema has a valid theme', () => {
    setPreferencesTheme('sepia')
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true }))
    )

    runThemeInit()

    expect(document.documentElement).toHaveClass('dark')
  })
})
