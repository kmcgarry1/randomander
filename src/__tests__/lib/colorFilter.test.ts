import { describe, expect, it, vi } from 'vitest'
import {
  compileColorFilter,
  type ColorCount,
  type ColorCountMode,
  type ColorFilterMode,
} from '../../lib/colorFilter'

const card = (...colors: string[]) => ({ color_identity: colors })

describe('mode-aware color filter compiler', () => {
  it.each<{
    name: string
    mode: ColorFilterMode
    count: ColorCount
    comparison: ColorCountMode
    focus: string[]
    clause: string
    candidate: string[]
    candidateMatches: boolean
    result: string[][]
    resultMatches: boolean
  }>([
    {
      name: 'Commander Any has no color clause',
      mode: 'commander',
      count: 'any',
      comparison: 'up-to',
      focus: [],
      clause: '',
      candidate: ['W', 'U', 'B', 'R', 'G'],
      candidateMatches: true,
      result: [['W', 'U', 'B', 'R', 'G']],
      resultMatches: true,
    },
    {
      name: 'Commander Up to constrains both palette and count',
      mode: 'commander',
      count: '2',
      comparison: 'up-to',
      focus: ['W', 'U'],
      clause: 'ci<=wu ci<=2 ci>0',
      candidate: ['W'],
      candidateMatches: true,
      result: [['W', 'U']],
      resultMatches: true,
    },
    {
      name: 'Commander Exactly counts within a larger focus instead of requiring it all',
      mode: 'commander',
      count: '1',
      comparison: 'exactly',
      focus: ['W', 'U'],
      clause: 'ci<=wu ci=1 ci>0',
      candidate: ['U'],
      candidateMatches: true,
      result: [['W', 'U']],
      resultMatches: false,
    },
    {
      name: 'Commander colorless is explicit',
      mode: 'commander',
      count: '0',
      comparison: 'exactly',
      focus: ['C'],
      clause: 'ci=c',
      candidate: [],
      candidateMatches: true,
      result: [[]],
      resultMatches: true,
    },
    {
      name: 'Partner Exactly applies to the combined pair',
      mode: 'partner',
      count: '2',
      comparison: 'exactly',
      focus: ['W', 'U', 'B'],
      clause: 'ci<=wub ci<=2',
      candidate: [],
      candidateMatches: true,
      result: [['W'], ['U']],
      resultMatches: true,
    },
    {
      name: 'Partner Exactly rejects a pair whose union is too small',
      mode: 'partner',
      count: '2',
      comparison: 'exactly',
      focus: ['W', 'U'],
      clause: 'ci<=wu ci<=2',
      candidate: ['W'],
      candidateMatches: true,
      result: [['W'], []],
      resultMatches: false,
    },
    {
      name: 'Spark Up to validates the combined palette',
      mode: 'spark',
      count: '2',
      comparison: 'up-to',
      focus: ['W', 'U'],
      clause: 'ci<=wu ci<=2',
      candidate: [],
      candidateMatches: true,
      result: [['W'], [], ['U']],
      resultMatches: true,
    },
  ])('$name', (fixture) => {
    const compiled = compileColorFilter({
      mode: fixture.mode,
      colorCount: fixture.count,
      colorCountMode: fixture.comparison,
      selectedColors: fixture.focus,
    })

    expect(compiled.problem).toBeNull()
    expect(compiled.getScryfallClause()).toBe(fixture.clause)
    expect(compiled.matchesCandidate(card(...fixture.candidate))).toBe(
      fixture.candidateMatches
    )
    expect(compiled.matchesResult(fixture.result.map((colors) => card(...colors)))).toBe(
      fixture.resultMatches
    )
  })

  it.each([
    {
      name: 'colored focus cannot produce zero colors',
      mode: 'commander' as const,
      colorCount: '0' as const,
      colorCountMode: 'up-to' as const,
      selectedColors: ['W'],
      code: 'colored-focus-with-zero-count',
    },
    {
      name: 'Exact count cannot exceed the selected focus',
      mode: 'partner' as const,
      colorCount: '3' as const,
      colorCountMode: 'exactly' as const,
      selectedColors: ['W', 'U'],
      code: 'exact-count-exceeds-focus',
    },
    {
      name: 'Colorless cannot satisfy a positive Exact count',
      mode: 'spark' as const,
      colorCount: '1' as const,
      colorCountMode: 'exactly' as const,
      selectedColors: ['C'],
      code: 'exact-count-exceeds-focus',
    },
    {
      name: 'Colorless and colored focus cannot be mixed',
      mode: 'commander' as const,
      colorCount: 'any' as const,
      colorCountMode: 'up-to' as const,
      selectedColors: ['C', 'W'],
      code: 'colorless-mixed-with-colors',
    },
  ])('detects impossible input: $name', ({ code, ...input }) => {
    const compiled = compileColorFilter(input)

    expect(compiled.problem).toMatchObject({ code })
    expect(compiled.getScryfallClause()).toBe('')
    expect(compiled.matchesCandidate(card('W'))).toBe(false)
    expect(compiled.matchesResult([card('W')])).toBe(false)
  })

  it('uses the requested Exact palette size for Spark', () => {
    const compiled = compileColorFilter({
      mode: 'spark',
      colorCount: '2',
      colorCountMode: 'exactly',
      selectedColors: ['W', 'U', 'B'],
    })
    const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0)
    const palette = compiled.pickSparkPalette(random)

    expect(palette).toEqual(['W', 'U'])
    expect(compiled.getScryfallClause(palette)).toBe('ci<=wu ci<=2')
    expect(compiled.matchesResult([card('W'), card('U'), card()], palette)).toBe(
      true
    )
    expect(compiled.matchesResult([card('W'), card(), card()], palette)).toBe(
      false
    )
  })

  it('never chooses an empty Up to palette when colored focus excludes Colorless', () => {
    const compiled = compileColorFilter({
      mode: 'spark',
      colorCount: '3',
      colorCountMode: 'up-to',
      selectedColors: ['W', 'U', 'B'],
    })

    expect(compiled.pickSparkPalette(() => 0)).toEqual(['W'])
  })
})
