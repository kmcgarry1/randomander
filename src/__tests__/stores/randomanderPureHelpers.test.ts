import { describe, expect, it } from 'vitest'
import type { ScryfallCard } from '../../lib/scryfall'
import {
  getMetadataKey,
  getMetadataTargets,
  usesCommanderMetadataLink,
} from '../../stores/randomanderMetadata'
import {
  getPartnerActionLabel,
  requireLegalPartnerPair,
} from '../../stores/randomanderPairing'
import {
  getPullRecordFingerprint,
  getResultFingerprint,
  prependHistoryRecord,
  snapshotPullRecord,
} from '../../stores/randomanderRecords'
import type { PullRecord } from '../../stores/randomander'
import { DEFAULT_OPTIONS } from '../../stores/randomanderPersistence'

const card = (
  id: string,
  name: string,
  oracleText = 'Partner'
): ScryfallCard => ({
  id,
  name,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
  color_identity: ['W'],
  type_line: 'Legendary Creature — Human',
  oracle_text: oracleText,
  keywords: oracleText === 'Partner' ? ['Partner'] : [],
})

const record = (id: string): PullRecord => ({
  id,
  createdAt: '2026-08-11T12:00:00.000Z',
  mode: 'partner',
  options: { ...DEFAULT_OPTIONS, selectedColors: ['W'] },
  cards: [card('a', 'Alpha'), card('b', 'Beta')],
})

describe('pure Randomander store helpers', () => {
  it('fingerprints unordered groups deterministically and snapshots deeply', () => {
    const source = record('one')
    const snapshot = snapshotPullRecord(source)
    snapshot.cards[0]!.name = 'Changed'

    expect(source.cards[0]?.name).toBe('Alpha')
    expect(getPullRecordFingerprint(source)).toBe('partner:a,b')
    expect(
      getResultFingerprint('partner', [...source.cards].reverse())
    ).toBe('partner:a,b')
    expect(prependHistoryRecord([], source, 1)).toHaveLength(1)
  })

  it('builds pair metadata targets without depending on mutable store state', () => {
    const group = [card('a', 'Alpha'), card('b', 'Béta')]
    const key = getMetadataKey(group[0]!, group, true)
    const targets = getMetadataTargets([group], {
      enabled: true,
      mode: 'partner',
      showTags: true,
      usePairTags: true,
    })

    expect(key).toBeTruthy()
    expect(targets.get(key!)).toContain(key)
    expect(usesCommanderMetadataLink('spark', group[0]!)).toBe(false)
  })

  it('labels and validates partner actions', () => {
    const first = card('a', 'Alpha')
    const second = card('b', 'Beta')
    expect(getPartnerActionLabel(first)).toBe('Randomize partner')
    expect(requireLegalPartnerPair(first, second)).toEqual([first, second])

    const incompatible = card('c', 'Gamma', '')
    expect(() => requireLegalPartnerPair(first, incompatible)).toThrow(
      /incompatible commander pair/i
    )
  })
})
