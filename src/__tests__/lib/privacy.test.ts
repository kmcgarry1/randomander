import { describe, expect, it } from 'vitest'
import { shouldEnableAnalytics } from '../../lib/privacy'

describe('analytics privacy gate', () => {
  it('is disabled unless an exact production build flag opts in', () => {
    expect(
      shouldEnableAnalytics({ production: true, enabledFlag: undefined })
    ).toBe(false)
    expect(
      shouldEnableAnalytics({ production: true, enabledFlag: 'TRUE' })
    ).toBe(false)
    expect(
      shouldEnableAnalytics({ production: false, enabledFlag: 'true' })
    ).toBe(false)
    expect(
      shouldEnableAnalytics({ production: true, enabledFlag: 'true' })
    ).toBe(true)
  })

  it.each(['1', 'yes', ' YES '])(
    'honors the Do Not Track value %j even in an enabled production build',
    (doNotTrack) => {
      expect(
        shouldEnableAnalytics({
          production: true,
          enabledFlag: 'true',
          doNotTrack,
        })
      ).toBe(false)
    }
  )

  it('honors Global Privacy Control', () => {
    expect(
      shouldEnableAnalytics({
        production: true,
        enabledFlag: 'true',
        globalPrivacyControl: true,
      })
    ).toBe(false)
  })
})

