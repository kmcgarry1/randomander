<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  modes,
  type Mode,
  useRandomanderStore,
} from "../../stores/randomander";
import { getPartnerKind, type ScryfallCard } from "../../lib/scryfall";
import HeroStage from "./components/HeroStage.vue";
import ChoiceOptionsSection from "./components/ChoiceOptionsSection.vue";
import DrawBackdrop from "./components/DrawBackdrop.vue";
import ResultDetailsSection from "./components/ResultDetailsSection.vue";
import { useHeroSummary } from "./composables/useHeroSummary";
import { formatColorIdentity, getEdhrecCommanderUrl } from "../../lib/scryfall";

const store = useRandomanderStore();
const {
  mode,
  choices,
  display,
  errorMessage,
  hasResults,
  isChoiceMode,
  isCurrentSaved,
  isLoading,
  options,
  stageTitle,
  statusText,
  canRandomizePartner,
  partnerButtonLabel,
  performance,
} = storeToRefs(store);

const heroSummary = useHeroSummary();
const {
  heroCard,
  heroCards,
  heroSubtitle,
  heroPartnerKind,
  heroHasCompanionSlot,
  heroCompanionButtonLabel,
  heroGroup,
} = heroSummary;

const heroScryfallUrl = computed(() => heroCard.value?.scryfall_uri ?? "");
const heroEdhrecUrl = computed(() =>
  heroGroup.value.length === 2
    ? `https://edhrec.com/commanders/${store.getPartnerSlugForGroup(heroGroup.value)}`
    : heroCard.value
      ? getEdhrecCommanderUrl(heroCard.value)
      : "",
);

const heroTitle = computed(() =>
  heroGroup.value.length > 1
    ? heroGroup.value.map((card) => card.name).join(" + ")
    : heroCard.value?.name ?? stageTitle.value,
);

const partnerNames = computed(() => {
  if (mode.value === "spark" || heroGroup.value.length <= 1) {
    return "";
  }
  return heroGroup.value
    .slice(1)
    .map((card) => card.name)
    .join(" / ");
});

const filterChips = computed(() => {
  const chips: string[] = [];
  if (options.value.selectedColors.length) {
    chips.push(formatColorIdentity(options.value.selectedColors));
  } else if (options.value.colorCount !== "any") {
    chips.push(`Colors ${options.value.colorCount}`);
  }
  if (options.value.colorCountMode === "exactly") {
    chips.push("Exact colors");
  }
  if (options.value.twoChoices && mode.value !== "spark") {
    chips.push("Two choices");
  }
  if (options.value.useRankCutoff) {
    chips.push("Skip top 10% EDHREC");
  }
  if (options.value.limitByDecks && !options.value.useRankCutoff) {
    chips.push(`Decks < ${options.value.maxDecks}`);
  }
  if (mode.value === "spark" && options.value.excludeGameChangers) {
    chips.push("No Game Changers");
  }
  return chips;
});

const modeLabel = computed(
  () => modes.find((option) => option.id === mode.value)?.label ?? "Commander",
);

const stageChips = computed(() => [modeLabel.value, ...filterChips.value]);

const resultMessage = computed(() => {
  if (errorMessage.value) return errorMessage.value;
  if (hasResults.value) return statusText.value;
  return "";
});

const detailsOpen = ref(false);
const detailsLabel = computed(() => (detailsOpen.value ? "Hide details" : "Show details"));

const activeResultKey = computed(() => {
  if (isChoiceMode.value) {
    return choices.value
      .map((choice) => choice.cards.map((card) => card.id).join("|"))
      .join("::");
  }
  return heroGroup.value.map((card) => card.id).join("|");
});

const backdropCards = computed(() =>
  isChoiceMode.value ? choices.value.flatMap((choice) => choice.cards) : heroCards.value,
);

const buildSearchCards = computed(() =>
  isChoiceMode.value ? [] : heroGroup.value.filter((card) => !!card.id),
);

const formatSearchLine = (
  card: ScryfallCard,
  prefix: "1" | "1x",
) => {
  const setCode = card.set ? card.set.toUpperCase() : "";
  const number = card.collector_number ?? "";
  const parts = [prefix, card.name];
  if (setCode) parts.push(`(${setCode})`);
  if (number) parts.push(number);
  return parts.join(" ").trim();
};

const buildMultisearchUrl = (
  format: "archidekt" | "moxfield",
  cardsToSearch: ScryfallCard[],
) => {
  if (cardsToSearch.length === 0) return "";
  const quantity = format === "archidekt" ? "1x" : "1";
  const lines = cardsToSearch
    .map((card) => formatSearchLine(card, quantity))
    .join("|");
  return `https://www.tcg.land/multisearch#/magic-the-gathering?format=${format}&separator=%7C&lines=${encodeURIComponent(
    lines,
  )}`;
};

const archidektUrl = computed(() =>
  display.value.showLinks
    ? buildMultisearchUrl("archidekt", buildSearchCards.value)
    : "",
);

const moxfieldUrl = computed(() =>
  display.value.showLinks
    ? buildMultisearchUrl("moxfield", buildSearchCards.value)
    : "",
);

const pairLinkUrl = computed(() =>
  heroGroup.value.length === 2
    ? `https://edhrec.com/commanders/${store.getPartnerSlugForGroup(heroGroup.value)}`
    : "",
);

const updateMode = (value: Mode) => {
  mode.value = value;
};

const handleRandomize = () => {
  store.randomize();
};

const handleSaveCurrent = () => {
  store.saveCurrent();
};

const handlePartner = () => {
  store.randomizePartnerForPrimary();
};

const handleChoicePartner = (index: number) => {
  store.randomizePartnerForChoice(index);
};

const canRandomizeChoicePartner = (card: ScryfallCard) =>
  getPartnerKind(card) !== null;

const handleHeroCompanion = () => {
  if (heroPartnerKind.value === "choose_background") {
    store.randomizeCommanderForBackground();
  } else {
    store.randomizePartnerForPrimary();
  }
};

const openFilters = () => {
  store.openOptions();
};

const openHistory = () => {
  store.openHistoryPanel();
};

const openSaved = () => {
  store.openSavedPanel();
};

const openSettings = () => {
  store.view = "settings";
};

const toggleDetails = () => {
  detailsOpen.value = !detailsOpen.value;
};

watch(activeResultKey, () => {
  detailsOpen.value = false;
});
</script>

<template>
  <section class="motion-fade-up relative isolate mt-6">
    <DrawBackdrop :cards="backdropCards" :simplified="performance.simplifyBackdrop" />

    <div class="relative z-10 mx-auto flex max-w-[76rem] flex-col items-center gap-5 pt-3 sm:gap-6">
      <div class="flex max-w-3xl flex-col items-center gap-3 text-center">
        <div class="flex flex-wrap justify-center gap-2">
          <span
            v-for="chip in stageChips"
            :key="chip"
            class="motion-chip rounded-full border border-white/80 bg-white/78 px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-950/78 dark:text-slate-300"
          >
            {{ chip }}
          </span>
        </div>
      </div>

      <div class="flex w-full justify-center">
        <div
          class="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-white/80 bg-white/74 p-1.5 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-950/74"
        >
          <button
            v-for="option in modes"
            :key="option.id"
            type="button"
            class="motion-nav motion-press rounded-full px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.22em] transition"
            :class="
              mode === option.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            "
            :aria-pressed="mode === option.id"
            @click="updateMode(option.id)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

      <div class="w-full max-w-[44rem]">
        <ChoiceOptionsSection
          v-if="isChoiceMode && choices.length"
          :choices="choices"
          :is-loading="isLoading"
          :show-links="display.showLinks"
          :can-randomize-choice-partner="canRandomizeChoicePartner"
          :on-choice-partner="handleChoicePartner"
          :get-partner-button-label="store.getPartnerButtonLabel"
        />
        <HeroStage
          v-else
          :stage-title="stageTitle"
          :hero-card-name="heroTitle"
          :hero-subtitle="heroSubtitle"
          :hero-cards="heroCards"
          :hero-scryfall-url="heroScryfallUrl"
          :hero-edhrec-url="heroEdhrecUrl"
          :show-links="display.showLinks"
          :mode="mode"
        />
      </div>

      <div
        v-if="
          !isChoiceMode &&
          mode !== 'spark' &&
          (partnerNames || canRandomizePartner || heroHasCompanionSlot)
        "
        class="flex flex-wrap items-center justify-center gap-2"
      >
        <span
          v-if="partnerNames"
          class="rounded-full border border-white/80 bg-white/78 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-950/78 dark:text-slate-200"
        >
          {{ partnerNames }}
        </span>
        <button
          v-if="canRandomizePartner"
          type="button"
          class="motion-press rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-slate-800 disabled:opacity-60 dark:border-slate-700/60"
          @click="handlePartner"
          :disabled="isLoading"
        >
          {{ partnerButtonLabel }}
        </button>
        <button
          v-if="heroHasCompanionSlot"
          type="button"
          class="motion-press rounded-full border border-slate-200 bg-white px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
          @click="handleHeroCompanion"
          :disabled="isLoading"
        >
          {{ heroCompanionButtonLabel }}
        </button>
      </div>

      <div
        v-if="resultMessage"
        class="w-full max-w-xl rounded-full border px-5 py-3 text-center shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)] backdrop-blur-lg"
        :class="
          errorMessage
            ? 'border-rose-200 bg-rose-50/92 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100'
            : 'border-white/80 bg-white/56 text-slate-700 dark:border-slate-700/60 dark:bg-slate-950/56 dark:text-slate-200'
        "
      >
        <p class="text-[0.58rem] font-semibold uppercase tracking-[0.28em]">
          {{ errorMessage ? "Draw issue" : "Current pull" }}
        </p>
        <p class="mt-1 text-sm leading-relaxed">
          {{ resultMessage }}
        </p>
      </div>

      <div class="flex w-full max-w-[44rem] flex-col items-center gap-3">
        <button
          type="button"
          class="motion-press motion-pulse flex min-w-[15rem] items-center justify-center rounded-full border border-amber-300 bg-amber-400 px-8 py-3 text-[0.72rem] font-semibold uppercase tracking-[0.35em] text-slate-900 shadow-[0_22px_45px_-28px_rgba(251,191,36,0.62)] transition hover:bg-amber-300 disabled:opacity-60"
          :disabled="isLoading"
          @click="handleRandomize"
        >
          {{ isLoading ? "Shuffling..." : "Randomize" }}
        </button>

        <div
          class="flex flex-wrap justify-center gap-2 rounded-[1.9rem] border border-white/80 bg-white/54 px-3 py-3 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/54"
        >
          <button
            type="button"
            class="motion-press rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900"
            :class="isCurrentSaved ? 'motion-pop' : ''"
            :disabled="!hasResults || isCurrentSaved || isLoading"
            @click="handleSaveCurrent"
          >
            {{ isCurrentSaved ? "Saved" : "Save current" }}
          </button>
          <button
            v-if="!isChoiceMode && hasResults"
            type="button"
            class="motion-press rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="toggleDetails"
          >
            {{ detailsLabel }}
          </button>
          <button
            type="button"
            class="motion-press rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="openHistory"
          >
            History
          </button>
          <button
            type="button"
            class="motion-press rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="openSaved"
          >
            Saved pulls
          </button>
          <button
            type="button"
            class="motion-press rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="openFilters"
          >
            Filters
          </button>
          <button
            type="button"
            class="motion-press rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900"
            @click="openSettings"
          >
            Settings
          </button>
        </div>
      </div>

      <Transition name="details-sheet">
        <div
          v-if="detailsOpen && !isChoiceMode && hasResults"
          class="w-full max-w-[58rem]"
        >
          <section
            class="overflow-hidden rounded-[2.2rem] border border-white/80 bg-white/52 px-4 py-4 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.3)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-950/54 sm:px-5"
          >
            <div
              class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="max-w-xl">
                <p
                  class="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
                >
                  Brew details
                </p>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Open the supporting metadata only when this pull is worth
                  exploring.
                </p>
              </div>
              <div class="flex flex-wrap gap-2 sm:justify-end">
                <a
                  v-if="archidektUrl"
                  :href="archidektUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="motion-press rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-amber-300"
                >
                  Build on Archidekt
                </a>
                <a
                  v-if="moxfieldUrl"
                  :href="moxfieldUrl"
                  target="_blank"
                  rel="noreferrer"
                  class="motion-press rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-slate-700 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Build on Moxfield
                </a>
              </div>
            </div>

            <div class="mt-4">
              <ResultDetailsSection
                :cards="heroCards"
                :group="heroGroup"
                :show-links="display.showLinks"
                :show-metadata="display.showTags"
                :pair-link-url="pairLinkUrl"
              />
            </div>
          </section>
        </div>
      </Transition>
    </div>
  </section>
</template>
