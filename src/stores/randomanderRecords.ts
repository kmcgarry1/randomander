import type { ScryfallCard } from '../lib/scryfall'
import type {
  CommanderChoice,
  Mode,
  PullRecord,
} from './randomander'

// Pull records cross both reactive and JSON persistence boundaries. A JSON
// snapshot deliberately strips proxies and prevents current, History, and
// Saved state from sharing nested card or choice references.
export const snapshotPullRecord = (record: PullRecord): PullRecord =>
  JSON.parse(JSON.stringify(record)) as PullRecord

export const getResultGroups = (
  cards: readonly ScryfallCard[],
  choices?: readonly CommanderChoice[]
): readonly (readonly ScryfallCard[])[] =>
  choices?.length
    ? choices.map((choice) => choice.cards)
    : cards.length > 0
      ? [cards]
      : []

export const getResultFingerprint = (
  mode: Mode,
  cards: readonly ScryfallCard[],
  choices?: readonly CommanderChoice[]
) => {
  const groups = getResultGroups(cards, choices)
  if (groups.length === 0) return null

  const normalizedGroups = groups
    .map((group) => group.map((card) => card.id).slice().sort().join(','))
    .sort()
  return `${mode}:${normalizedGroups.join('|')}`
}

export const getPullRecordFingerprint = (record: PullRecord) =>
  getResultFingerprint(record.mode, record.cards, record.choices)

export const prependHistoryRecord = (
  history: readonly PullRecord[],
  record: PullRecord,
  limit: number
) => [snapshotPullRecord(record), ...history].slice(0, Math.max(0, limit))
