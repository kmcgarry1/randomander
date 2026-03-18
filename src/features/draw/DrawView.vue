<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import {
  AdjustmentsHorizontalIcon,
  Cog6ToothIcon,
} from "@heroicons/vue/24/outline";
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
  isLoading,
  options,
  stageTitle,
  performance,
} = storeToRefs(store);

const heroSummary = useHeroSummary();
const {
  heroCard,
  heroCards,
  heroIsBackground,
  heroSubtitle,
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

const stageChips = computed(() => filterChips.value);

const detailsOpen = ref(false);
const detailsLabel = computed(() =>
  detailsOpen.value ? "Hide details" : "Show details",
);
const activeFilterCount = computed(() => filterChips.value.length);
const isMobileViewport = ref(false);

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

const handleChoicePartner = (index: number) => {
  store.randomizePartnerForChoice(index);
};

const canRandomizeChoicePartner = (card: ScryfallCard) =>
  getPartnerKind(card) !== null;

const handleHeroCompanion = () => {
  if (heroIsBackground.value) {
    store.randomizeCommanderForBackground();
  } else {
    store.randomizePartnerForPrimary();
  }
};

const openFilters = () => {
  store.openOptions();
};

const openSettings = () => {
  store.openSettingsPanel();
};

const toggleDetails = () => {
  detailsOpen.value = !detailsOpen.value;
};

let viewportQuery: MediaQueryList | null = null;

const syncViewport = (event?: MediaQueryListEvent) => {
  if (event) {
    isMobileViewport.value = event.matches;
    return;
  }
  isMobileViewport.value = viewportQuery?.matches ?? false;
};

onMounted(() => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return;
  }

  viewportQuery = window.matchMedia("(max-width: 639px)");
  syncViewport();

  if (typeof viewportQuery.addEventListener === "function") {
    viewportQuery.addEventListener("change", syncViewport);
    return;
  }

  viewportQuery.addListener(syncViewport);
});

onBeforeUnmount(() => {
  if (!viewportQuery) return;

  if (typeof viewportQuery.removeEventListener === "function") {
    viewportQuery.removeEventListener("change", syncViewport);
    return;
  }

  viewportQuery.removeListener(syncViewport);
});

watch(activeResultKey, () => {
  detailsOpen.value = false;
});
</script>

<template>
  <section class="motion-fade-up relative isolate mt-2 sm:mt-6">
    <DrawBackdrop :cards="backdropCards" :simplified="performance.simplifyBackdrop" />

    <div class="relative z-10 mx-auto flex max-w-[76rem] flex-col items-center gap-5 pt-1 sm:gap-6 sm:pt-3">
      <div class="order-2 flex max-w-3xl flex-col items-center gap-3 text-center sm:order-1">
        <div
          v-if="stageChips.length"
          class="flex flex-wrap justify-center gap-2"
        >
          <span
            v-for="chip in stageChips"
            :key="chip"
            class="motion-chip rounded-full border border-white/80 bg-white/78 px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-slate-600 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-950/78 dark:text-slate-300"
          >
            {{ chip }}
          </span>
        </div>
      </div>

      <div class="order-1 w-full max-w-[28rem] sm:order-2 sm:max-w-full">
        <div class="grid grid-cols-3 gap-2 sm:hidden">
          <button
            v-for="option in modes"
            :key="`mobile-${option.id}`"
            type="button"
            class="motion-nav motion-press min-h-[3.5rem] rounded-[1.25rem] border px-2 py-2 text-center text-[0.68rem] font-semibold uppercase tracking-[0.14em] transition"
            :class="
              mode === option.id
                ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                : 'border-white/80 bg-white/74 text-slate-600 backdrop-blur-md hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/60 dark:bg-slate-950/74 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white'
            "
            :aria-pressed="mode === option.id"
            @click="updateMode(option.id)"
          >
            <span class="block leading-tight">
              {{ option.label }}
            </span>
          </button>
        </div>

        <div class="hidden w-full justify-center sm:flex">
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
      </div>

      <div class="order-3 w-full max-w-[44rem] sm:order-3">
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
          heroGroup.length === 1 &&
          heroHasCompanionSlot
        "
        class="order-4 flex flex-wrap items-center justify-center gap-2 sm:order-4"
      >
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
        v-if="errorMessage"
        class="order-5 w-full max-w-xl rounded-[1.5rem] border border-rose-200 bg-rose-50/92 px-5 py-3 text-center text-rose-900 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.28)] backdrop-blur-lg dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100 sm:order-5"
      >
        <p class="text-sm leading-relaxed">
          {{ errorMessage }}
        </p>
      </div>

      <section
        class="order-6 w-full max-w-[30rem] sm:order-6 sm:max-w-[58rem]"
      >
        <div
          class="overflow-hidden rounded-[2rem] border border-white/80 bg-white/52 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.3)] backdrop-blur-2xl dark:border-slate-700/60 dark:bg-slate-950/54"
        >
          <div class="flex flex-col gap-3 px-4 py-4 sm:px-5">
            <button
              v-if="!isMobileViewport"
              type="button"
              class="motion-press motion-pulse flex min-h-12 w-full items-center justify-center rounded-full border border-amber-300 bg-amber-400 px-8 py-3 text-base font-semibold text-slate-900 shadow-[0_22px_45px_-28px_rgba(251,191,36,0.62)] transition hover:bg-amber-300 disabled:opacity-60 sm:min-w-[15rem] sm:w-auto sm:self-center sm:text-[0.72rem] sm:uppercase sm:tracking-[0.35em]"
              :disabled="isLoading"
              @click="handleRandomize"
            >
              {{ isLoading ? "Shuffling..." : "Randomize" }}
            </button>

            <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
              <button
                v-if="!isChoiceMode && hasResults"
                type="button"
                class="motion-press inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/82 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900 sm:min-h-0 sm:text-[0.6rem] sm:font-semibold sm:uppercase sm:tracking-[0.2em]"
                @click="toggleDetails"
                :aria-expanded="detailsOpen"
                aria-controls="result-details-panel"
              >
                {{ detailsLabel }}
              </button>
              <button
                type="button"
                class="motion-press hidden min-h-11 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-950/82 dark:text-slate-200 dark:hover:bg-slate-900 sm:inline-flex sm:min-h-0 sm:text-[0.6rem] sm:font-semibold sm:uppercase sm:tracking-[0.2em]"
                @click="openSettings"
              >
                Settings
              </button>
            </div>
          </div>

          <Transition name="details-sheet">
            <div
              v-if="detailsOpen && !isChoiceMode && hasResults"
              id="result-details-panel"
              class="border-t border-white/70 px-4 py-4 dark:border-slate-700/60 sm:px-5"
            >
              <ResultDetailsSection
                :cards="heroCards"
                :group="heroGroup"
                :show-links="display.showLinks"
                :show-metadata="display.showTags"
                :pair-link-url="pairLinkUrl"
              />
            </div>
          </Transition>
        </div>
      </section>
    </div>

    <div
      v-if="isMobileViewport"
      class="fixed inset-x-0 bottom-0 z-20 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:hidden"
    >
      <div
        class="mx-auto flex max-w-[30rem] items-center gap-3 rounded-[1.75rem] border border-white/80 bg-slate-950/88 px-3 py-3 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-slate-700/60"
      >
        <button
          type="button"
          class="motion-press relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6 text-slate-100 transition hover:bg-white/10"
          @click="openFilters"
          aria-label="Filters"
        >
          <AdjustmentsHorizontalIcon class="h-5 w-5" aria-hidden="true" />
          <span
            v-if="activeFilterCount"
            class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-slate-900"
          >
            {{ activeFilterCount }}
          </span>
        </button>

        <button
          type="button"
          class="motion-press motion-pulse flex min-h-12 flex-1 items-center justify-center rounded-full border border-amber-300 bg-amber-400 px-6 py-3 text-base font-semibold text-slate-900 shadow-[0_22px_45px_-28px_rgba(251,191,36,0.62)] transition hover:bg-amber-300 disabled:opacity-60"
          :disabled="isLoading"
          @click="handleRandomize"
        >
          {{ isLoading ? "Shuffling..." : "Randomize" }}
        </button>

        <button
          type="button"
          class="motion-press inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/6 text-slate-100 transition hover:bg-white/10"
          @click="openSettings"
          aria-label="Settings"
        >
          <Cog6ToothIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>
