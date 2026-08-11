import {
  getPartnerKind,
  getPartnerWithName,
  isBackgroundCard,
  isLegalPartnerPair,
  type ScryfallCard,
} from '../lib/scryfall'

export const getPartnerActionLabel = (card: ScryfallCard | null) => {
  if (isBackgroundCard(card)) return 'Find commander'
  const partnerKind = card ? getPartnerKind(card) : null
  switch (partnerKind) {
    case 'partner_with': {
      const partnerName = card ? getPartnerWithName(card) : null
      return partnerName ? `Get ${partnerName}` : 'Get partner'
    }
    case 'choose_background':
      return 'Randomize background'
    case 'friends_forever':
      return 'Randomize friend'
    case 'doctors_companion':
      return 'Randomize doctor'
    default:
      return 'Randomize partner'
  }
}

export const requireLegalPartnerPair = (
  first: ScryfallCard,
  second: ScryfallCard
): [ScryfallCard, ScryfallCard] => {
  if (!isLegalPartnerPair(first, second)) {
    throw new Error('Scryfall returned an incompatible commander pair.')
  }
  return [first, second]
}
