import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRandomanderStore } from "../../../stores/randomander";
import {
  getCardImageUrl,
  getPartnerKind,
  isBackgroundCard,
} from "../../../lib/scryfall";

export function useHeroSummary() {
  const store = useRandomanderStore();
  const {
    mode,
    isChoiceMode,
    cards,
    stageTitle,
    partnerButtonLabel,
  } = storeToRefs(store);

  const heroGroup = computed(() =>
    isChoiceMode.value ? [] : cards.value,
  );

  const heroCard = computed(() => heroGroup.value[0] ?? null);
  const heroCards = computed(() => heroGroup.value.slice(0, 3));

  const heroPartnerKind = computed(() =>
    heroCard.value ? getPartnerKind(heroCard.value) : null,
  );

  const heroIsBackground = computed(() => isBackgroundCard(heroCard.value));

  const heroHasCompanionSlot = computed(
    () =>
      mode.value === "commander" &&
      (heroIsBackground.value || heroPartnerKind.value !== null) &&
      heroGroup.value.length === 1 &&
      !isChoiceMode.value,
  );

  const heroPartnerSlug = computed(() => {
    if (heroGroup.value.length !== 2) return null;
    return store.getPartnerSlugForGroup(heroGroup.value);
  });

  const heroPartnerLinkUrl = computed(() =>
    heroPartnerSlug.value
      ? `https://edhrec.com/commanders/${heroPartnerSlug.value}`
      : null,
  );

  const heroCompanionButtonLabel = computed(() => {
    if (heroIsBackground.value) {
      return "Find commander";
    }
    return partnerButtonLabel.value;
  });

  const heroBackgroundStyle = computed<Record<string, string>>(() => {
    if (!heroCard.value) return {} as Record<string, string>;
    const url = getCardImageUrl(heroCard.value);
    if (!url) return {} as Record<string, string>;
    return {
      backgroundImage: `url(${url})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  });

  const heroHeadline = computed(() =>
    heroCard.value ? heroCard.value.name : stageTitle.value,
  );

  return {
    heroGroup,
    heroCard,
    heroCards,
    heroPartnerKind,
    heroHasCompanionSlot,
    heroPartnerLinkUrl,
    heroCompanionButtonLabel,
    heroBackgroundStyle,
    heroHeadline,
    heroIsBackground,
  };
}
