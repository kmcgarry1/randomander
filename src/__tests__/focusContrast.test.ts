import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(resolve('src/style.css'), 'utf8')

const getThemeBlock = (selector: string) => {
  const escapedSelector = selector.replace('.', '\\.')
  const match = stylesheet.match(
    new RegExp(`${escapedSelector}\\s*\\{([\\s\\S]*?)\\n\\s*\\}`)
  )
  if (!match?.[1]) throw new Error(`Could not find ${selector} theme tokens`)
  return match[1]
}

const getColorToken = (block: string, token: string) => {
  const match = block.match(
    new RegExp(`--md-sys-color-${token}:\\s*(#[0-9a-fA-F]{6});`)
  )
  if (!match?.[1]) throw new Error(`Could not find color token ${token}`)
  return match[1]
}

const relativeLuminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    )

  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}

const contrastRatio = (first: string, second: string) => {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

const backgroundTokens = [
  'primary',
  'primary-container',
  'secondary',
  'secondary-container',
  'tertiary',
  'tertiary-container',
  'error',
  'error-container',
  'surface',
  'surface-dim',
  'surface-bright',
  'surface-container-lowest',
  'surface-container-low',
  'surface-container',
  'surface-container-high',
  'surface-container-highest',
  'inverse-surface',
] as const

describe('global focus indicator', () => {
  it.each([
    ['light', ':root'],
    ['dark', 'html.dark'],
  ] as const)(
    'has at least one 3:1 ring color against every %s theme surface',
    (_theme, selector) => {
      const block = getThemeBlock(selector)
      const ring = getColorToken(block, 'focus-ring')
      const contrastRing = getColorToken(block, 'focus-ring-contrast')

      expect(
        contrastRatio(ring, contrastRing),
        `${selector} focus ring colors against each other`
      ).toBeGreaterThanOrEqual(3)

      for (const backgroundToken of backgroundTokens) {
        const background = getColorToken(block, backgroundToken)
        const bestRatio = Math.max(
          contrastRatio(ring, background),
          contrastRatio(contrastRing, background)
        )
        expect(
          bestRatio,
          `${selector} focus ring against ${backgroundToken}`
        ).toBeGreaterThanOrEqual(3)
      }
    }
  )

  it('uses the focus tokens and preserves a forced-colors indicator', () => {
    expect(stylesheet).toMatch(
      /outline:\s*3px solid var\(--md-sys-color-focus-ring\)/
    )
    expect(stylesheet).toMatch(
      /box-shadow:\s*0 0 0 7px var\(--md-sys-color-focus-ring-contrast\)/
    )
    expect(stylesheet).toMatch(
      /@media \(forced-colors: active\)[\s\S]*outline-color:\s*Highlight;[\s\S]*box-shadow:\s*none;/
    )
  })
})
