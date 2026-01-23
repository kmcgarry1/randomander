<script setup lang="ts">
import { storeToRefs } from "pinia";
import { getPartnerKind, type ScryfallCard } from "../../lib/scryfall";
import { modes, type Mode, useRandomanderStore } from "../../stores/randomander";
import HeroStage from "./components/HeroStage.vue";
import HeroDetailsSection from "./components/HeroDetailsSection.vue";
import DrawToolbar from "./components/DrawToolbar.vue";
import { useHeroSummary } from "./composables/useHeroSummary";
import { useManaFilters } from "./composables/useManaFilters";

const store = useRandomanderStore();
const {
  mode,
  isLoading,
  stageTitle,
  choices,
  isChoiceMode,
  statusText,
  isFirstLoad,
  canRandomizePartner,
  partnerButtonLabel,
} = storeToRefs(store);
const optionsState = store.options;
const colorOptionLabel = store.getColorOptionLabel;

const heroSummary = useHeroSummary();
const {
  heroGroup,
  heroCard,
  heroCards,
  heroPartnerKind,
  heroHasCompanionSlot,
  heroPartnerLinkUrl,
  heroCompanionButtonLabel,
  heroSubtitle,
  heroBackgroundStyle,
  heroHeadline,
  heroIsBackground,
} = heroSummary;

const {
  colorChoices,
  colorCountOptions,
  colorCountModeOptions,
  isColorlessActive,
  isColorSelected,
  toggleColorFilter,
} = useManaFilters(optionsState);

const handleRandomize = () => {
  store.randomize();
};

const handlePartner = () => {
  store.randomizePartnerForPrimary();
};

const handleCommanderForBackground = () => {
  store.randomizeCommanderForBackground();
};

const handleHeroCompanion = () => {
  if (heroPartnerKind.value === "choose_background") {
    handleCommanderForBackground();
    return;
  }
  handlePartner();
};

const canRandomizeChoicePartner = (card: ScryfallCard) =>
  getPartnerKind(card) !== null;

const handleChoicePartner = (index: number) => {
  store.randomizePartnerForChoice(index);
};

const updateMode = (value: Mode) => {
  mode.value = value;
};
</script>

<template>
  <section
    aria-live="polite"
    aria-atomic="true"
    :aria-busy="isLoading ? 'true' : 'false'"
    class="mt-10 flex flex-col gap-10 px-4"
  >
    <HeroStage
      v-if="isFirstLoad"
      :stage-title="stageTitle"
      :hero-card-name="heroCard?.name"
      :hero-subtitle="heroSubtitle"
      :hero-cards="heroCards"
      :is-loading="isLoading"
      @randomize="handleRandomize"
    />

    <HeroDetailsSection
      v-else
      :hero-cards="heroCards"
      :hero-group="heroGroup"
      :hero-has-companion-slot="heroHasCompanionSlot"
      :hero-partner-kind="heroPartnerKind"
      :hero-companion-button-label="heroCompanionButtonLabel"
      :hero-background-style="heroBackgroundStyle"
      :hero-headline="heroHeadline"
      :status-text="statusText"
      :hero-partner-link-url="heroPartnerLinkUrl"
      :hero-is-background="heroIsBackground"
      :can-randomize-partner="canRandomizePartner"
      :partner-button-label="partnerButtonLabel"
      :is-loading="isLoading"
      :hero-card="heroCard"
      :choices="choices"
      :is-choice-mode="isChoiceMode"
      :can-randomize-choice-partner="canRandomizeChoicePartner"
      :on-choice-partner="handleChoicePartner"
      :get-partner-button-label="store.getPartnerButtonLabel"
      :on-partner="handlePartner"
      :on-hero-companion="handleHeroCompanion"
      :on-commander-for-background="handleCommanderForBackground"
    />

    <DrawToolbar
      :mode="mode"
      :modes="modes"
      :options-state="optionsState"
      :color-count-mode-options="colorCountModeOptions"
      :color-count-options="colorCountOptions"
      :color-choices="colorChoices"
      :is-colorless-active="isColorlessActive"
      :is-color-selected="isColorSelected"
      :toggle-color-filter="toggleColorFilter"
      :color-option-label="colorOptionLabel"
      @update:mode="updateMode"
    />
  </section>
</template>
