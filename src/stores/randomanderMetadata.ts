import {
  getCardSlug,
  getEdhrecPairIdentifier,
  isBackgroundCard,
  type ScryfallCard,
} from '../lib/scryfall'
import { RuntimeDataError } from '../lib/runtimeValidation'
import { HttpError, RequestTimeoutError } from '../services/http'
import type { Mode } from './randomander'

export type MetadataTargetOptions = Readonly<{
  enabled: boolean
  mode: Mode
  showTags: boolean
  usePairTags: boolean
}>

export const usesCommanderMetadataLink = (
  mode: Mode,
  card: ScryfallCard
) => mode !== 'spark' && !isBackgroundCard(card)

export const getMetadataKey = (
  card: ScryfallCard,
  group: readonly ScryfallCard[],
  usePairTags: boolean
) =>
  usePairTags && group.length === 2
    ? getEdhrecPairIdentifier([...group])
    : getCardSlug(card)

export const getMetadataTargets = (
  groups: readonly (readonly ScryfallCard[])[],
  options: MetadataTargetOptions
) => {
  const targets = new Map<string, string[]>()
  if (!options.enabled || !options.showTags || options.mode === 'spark') {
    return targets
  }

  groups.forEach((group) => {
    if (group.length === 0) return
    if (options.usePairTags && group.length === 2) {
      if (!group.some((card) => usesCommanderMetadataLink(options.mode, card))) {
        return
      }
      const pairSlug = getEdhrecPairIdentifier([...group])
      if (!pairSlug) return
      const alphabeticalSlug = group
        .map((card) => getCardSlug(card))
        .slice()
        .sort((left, right) => left.localeCompare(right))
        .join('-')
      targets.set(
        pairSlug,
        alphabeticalSlug === pairSlug
          ? [pairSlug]
          : [pairSlug, alphabeticalSlug]
      )
      return
    }

    group.forEach((card) => {
      if (!usesCommanderMetadataLink(options.mode, card)) return
      const slug = getCardSlug(card)
      if (slug) targets.set(slug, [slug])
    })
  })
  return targets
}

export const getMetadataFailureMessage = (error: unknown) => {
  if (error instanceof RequestTimeoutError) {
    return 'EDHREC metadata timed out. Try again.'
  }
  if (error instanceof HttpError) {
    return `EDHREC metadata could not load (${error.status}). Try again.`
  }
  if (error instanceof RuntimeDataError) {
    return `EDHREC metadata could not be used. ${error.message}`
  }
  return 'EDHREC metadata could not load. Try again.'
}
