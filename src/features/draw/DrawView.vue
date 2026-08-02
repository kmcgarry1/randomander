<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import { storeToRefs } from "pinia";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  LightBulbIcon,
  SparklesIcon,
} from "@heroicons/vue/24/outline";
import {
  modes,
  type Mode,
  useRandomanderStore,
} from "../../stores/randomander";
import {
  formatColorIdentity,
  getCardImageUrl,
  getEdhrecCommanderUrl,
  getPartnerKind,
  type ScryfallCard,
} from "../../lib/scryfall";
import HeroStage from "./components/HeroStage.vue";
import ChoiceOptionsSection from "./components/ChoiceOptionsSection.vue";
import DrawBackdrop from "./components/DrawBackdrop.vue";
import ResultDetailsSection from "./components/ResultDetailsSection.vue";
import { useHeroSummary } from "./composables/useHeroSummary";

const REVEAL_TOTAL_MS = 2400;
const REVEAL_PRELOAD_TIMEOUT_MS = 4000;

const store = useRandomanderStore();
const {
  mode,
  choices,
  display,
  errorMessage,
  hasResults,
  history,
  isChoiceMode,
  isLoading,
  options,
  performance,
} = storeToRefs(store);

const {
  heroCard,
  heroCards,
  heroIsBackground,
  heroSubtitle,
  heroHasCompanionSlot,
  heroCompanionButtonLabel,
  heroGroup,
} = useHeroSummary();

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
    : heroCard.value?.name ?? "Your next commander",
);

const filterChips = computed(() => {
  const chips: string[] = [];
  if (options.value.selectedColors.length) {
    chips.push(formatColorIdentity(options.value.selectedColors));
  } else if (options.value.colorCount !== "any") {
    chips.push(`Colors ${options.value.colorCount}`);
  }
  if (options.value.colorCountMode === "exactly") chips.push("Exact colors");
  if (options.value.twoChoices && mode.value !== "spark") chips.push("Two choices");
  if (options.value.useRankCutoff) chips.push("Outside EDHREC top 10%");
  if (options.value.limitByDecks && !options.value.useRankCutoff) {
    chips.push(`Under ${options.value.maxDecks} decks`);
  }
  if (mode.value === "spark" && options.value.excludeGameChangers) {
    chips.push("No Game Changers");
  }
  return chips;
});

const activeFilterCount = computed(() => filterChips.value.length);
const activeModeLabel = computed(
  () => modes.find((option) => option.id === mode.value)?.label ?? "Commander",
);
const drawControlsOpen = ref(false);
const detailsOpen = ref(false);
const isWideViewport = ref(false);
const systemReducedMotion = ref(true);
const motionAvailable = ref(false);
const isRevealActive = ref(false);
const revealComplete = ref(false);
let revealTimer: number | undefined;
let revealStartTimer: number | undefined;
let revealPreloadController: AbortController | undefined;
let revealRequestId = 0;
let handledResultKey = "";
let wideViewportQuery: MediaQueryList | null = null;
let motionQuery: MediaQueryList | null = null;

const showHeroCompanion = computed(
  () =>
    !isChoiceMode.value &&
    mode.value !== "spark" &&
    heroGroup.value.length === 1 &&
    heroHasCompanionSlot.value,
);

const activeResultKey = computed(() => {
  const cardKey = isChoiceMode.value
    ? choices.value
        .map((choice) => choice.cards.map((card) => card.id).join("|"))
        .join("::")
    : heroGroup.value.map((card) => card.id).join("|");
  const sessionKey = history.value[0]?.id ?? "";
  return cardKey ? `${cardKey}--${sessionKey}` : "";
});

const cardsForReveal = computed(() =>
  isChoiceMode.value
    ? choices.value.flatMap((choice) => choice.cards)
    : heroCards.value,
);

const backdropCards = computed(() =>
  revealComplete.value
    ? isChoiceMode.value
      ? choices.value.flatMap((choice) => choice.cards)
      : heroCards.value
    : [],
);

const pairLinkUrl = computed(() =>
  heroGroup.value.length === 2
    ? `https://edhrec.com/commanders/${store.getPartnerSlugForGroup(heroGroup.value)}`
    : "",
);

const revealEnabled = computed(
  () =>
    display.value.enablePrestigeReveal &&
    !performance.value.reduceMotion &&
    motionAvailable.value &&
    !systemReducedMotion.value,
);

const revealInProgress = computed(
  () => hasResults.value && !revealComplete.value && revealEnabled.value,
);

const clearRevealTimer = () => {
  if (revealTimer !== undefined) {
    window.clearTimeout(revealTimer);
    revealTimer = undefined;
  }
};

const clearRevealStartTimer = () => {
  if (revealStartTimer !== undefined) {
    window.clearTimeout(revealStartTimer);
    revealStartTimer = undefined;
  }
};

const clearRevealPreload = () => {
  revealPreloadController?.abort();
  revealPreloadController = undefined;
};

const finishReveal = () => {
  revealRequestId += 1;
  clearRevealPreload();
  clearRevealStartTimer();
  clearRevealTimer();
  isRevealActive.value = false;
  revealComplete.value = hasResults.value;
  if (revealComplete.value && isWideViewport.value && !isChoiceMode.value) {
    detailsOpen.value = true;
  }
};

const beginReveal = async () => {
  revealStartTimer = undefined;
  clearRevealTimer();
  detailsOpen.value = false;
  revealComplete.value = false;

  if (!hasResults.value) {
    isRevealActive.value = false;
    return;
  }

  if (!revealEnabled.value) {
    await nextTick();
    finishReveal();
    return;
  }

  isRevealActive.value = true;
  await nextTick();
  revealTimer = window.setTimeout(finishReveal, REVEAL_TOTAL_MS);
};

const preloadCardImage = (source: string, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (typeof Image === "undefined" || signal.aborted) {
      resolve();
      return;
    }

    const image = new Image();
    let settled = false;
    let timeoutId: number | undefined;

    const settle = () => {
      if (settled) return;
      settled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", settle);
      image.onload = null;
      image.onerror = null;
      resolve();
    };

    image.onload = () => {
      if (typeof image.decode === "function") {
        void image.decode().catch(() => undefined).finally(settle);
      } else {
        settle();
      }
    };
    image.onerror = settle;
    signal.addEventListener("abort", settle, { once: true });
    timeoutId = window.setTimeout(settle, REVEAL_PRELOAD_TIMEOUT_MS);
    image.src = source;
  });

const prepareReveal = async (key: string) => {
  const requestId = ++revealRequestId;
  clearRevealPreload();

  if (!revealEnabled.value) {
    await beginReveal();
    return;
  }

  const controller = new AbortController();
  revealPreloadController = controller;
  const sources = Array.from(
    new Set(cardsForReveal.value.map(getCardImageUrl).filter(Boolean)),
  );
  await Promise.all(
    sources.map((source) => preloadCardImage(source, controller.signal)),
  );

  if (revealPreloadController === controller) {
    revealPreloadController = undefined;
  }
  if (
    controller.signal.aborted ||
    requestId !== revealRequestId ||
    key !== activeResultKey.value ||
    revealComplete.value
  ) {
    return;
  }

  revealStartTimer = window.setTimeout(() => {
    if (
      requestId === revealRequestId &&
      key === activeResultKey.value &&
      !revealComplete.value
    ) {
      void beginReveal();
    }
  }, 170);
};

const updateMode = (value: Mode) => {
  if (revealInProgress.value) return;
  mode.value = value;
};

const toggleDrawControls = () => {
  drawControlsOpen.value = !drawControlsOpen.value;
};

const handleRandomize = () => {
  if (revealInProgress.value) finishReveal();
  store.randomize();
};

const handleChoicePartner = (index: number) => {
  if (!revealInProgress.value) store.randomizePartnerForChoice(index);
};

const canRandomizeChoicePartner = (card: ScryfallCard) =>
  getPartnerKind(card) !== null;

const handleHeroCompanion = () => {
  if (revealInProgress.value) return;
  if (heroIsBackground.value) store.randomizeCommanderForBackground();
  else store.randomizePartnerForPrimary();
};

const toggleDetails = () => {
  detailsOpen.value = !detailsOpen.value;
};

const skipReveal = async () => {
  finishReveal();
  await nextTick();
  document
    .querySelector<HTMLElement>("[data-result-heading]")
    ?.focus({ preventScroll: true });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && revealInProgress.value) void skipReveal();
};

const syncWideViewport = (event?: MediaQueryListEvent) => {
  isWideViewport.value = event?.matches ?? wideViewportQuery?.matches ?? false;
};

const syncMotionPreference = (event?: MediaQueryListEvent) => {
  systemReducedMotion.value = event?.matches ?? motionQuery?.matches ?? true;
  if (
    systemReducedMotion.value &&
    hasResults.value &&
    !revealComplete.value
  ) {
    finishReveal();
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  if (typeof window.matchMedia !== "function") return;

  motionAvailable.value = true;
  wideViewportQuery = window.matchMedia("(min-width: 1280px)");
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncWideViewport();
  syncMotionPreference();
  wideViewportQuery.addEventListener?.("change", syncWideViewport);
  motionQuery.addEventListener?.("change", syncMotionPreference);
});

onBeforeUnmount(() => {
  revealRequestId += 1;
  clearRevealPreload();
  clearRevealStartTimer();
  clearRevealTimer();
  store.setMetadataSurfaceVisible(false);
  window.removeEventListener("keydown", handleKeydown);
  wideViewportQuery?.removeEventListener?.("change", syncWideViewport);
  motionQuery?.removeEventListener?.("change", syncMotionPreference);
});

watch(activeResultKey, (key) => {
  revealRequestId += 1;
  clearRevealPreload();
  clearRevealStartTimer();
  clearRevealTimer();
  detailsOpen.value = false;
  isRevealActive.value = false;
  revealComplete.value = false;
  if (!key) handledResultKey = "";
});

watch(
  [activeResultKey, isLoading],
  ([key, loading]) => {
    if (!key || loading || key === handledResultKey) return;
    handledResultKey = key;
    clearRevealStartTimer();
    void prepareReveal(key);
  },
  { immediate: true },
);
watch(revealEnabled, (enabled) => {
  if (!enabled && hasResults.value && !revealComplete.value) finishReveal();
});

watchEffect(() => {
  store.setMetadataSurfaceVisible(
    revealComplete.value &&
      hasResults.value &&
      !isChoiceMode.value &&
      display.value.showTags,
  );
});
</script>

<template>
  <section class="relative mx-auto w-full max-w-[100rem] overflow-x-clip px-3 py-4 sm:px-6 sm:py-8">
    <header class="mb-6 hidden items-end justify-between gap-8 sm:flex">
      <div class="max-w-2xl">
        <p class="m3-label">COMMANDER DISCOVERY</p>
        <h1 class="mt-2 text-[clamp(2rem,4vw,3.5rem)] font-[750] leading-[0.98] tracking-[-0.035em]">
          Find a deck worth building.
        </h1>
        <p class="mt-3 max-w-xl text-base text-[var(--md-sys-color-on-surface-variant)]">
          Pull a legal commander, explore a compatible pairing, or start from three unlikely cards.
        </p>
      </div>
      <button
        type="button"
        class="m3-button m3-button--tonal shrink-0"
        @click="store.openOptions()"
      >
        <AdjustmentsHorizontalIcon class="h-5 w-5" aria-hidden="true" />
        Filters
        <span
          v-if="activeFilterCount"
          class="grid min-w-6 place-items-center rounded-full bg-[var(--md-sys-color-on-secondary-container)] px-1.5 py-0.5 text-xs text-[var(--md-sys-color-secondary-container)]"
        >
          {{ activeFilterCount }}
        </span>
      </button>
    </header>

    <div class="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(22rem,1fr)_22rem] xl:gap-5">
      <aside class="m3-card m3-card--filled min-w-0 overflow-hidden p-3 lg:sticky lg:top-8 lg:p-5">
        <div class="flex min-h-11 items-center justify-between gap-3 lg:block">
          <div class="min-w-0">
            <p class="m3-label">DRAW MODE</p>
            <div class="mt-1 flex min-w-0 items-center gap-2">
              <h2 class="min-w-0 truncate text-lg font-bold lg:text-xl">
                <span class="lg:hidden">{{ activeModeLabel }}</span>
                <span class="hidden lg:inline">What should we find?</span>
              </h2>
              <span
                v-if="activeFilterCount"
                class="shrink-0 rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-xs font-semibold text-[var(--md-sys-color-on-secondary-container)] lg:hidden"
              >
                {{ activeFilterCount }} filter{{ activeFilterCount === 1 ? "" : "s" }}
              </span>
            </div>
          </div>
          <button
            type="button"
            class="m3-button m3-button--text min-h-11 shrink-0 px-3 py-2 lg:hidden"
            :aria-expanded="drawControlsOpen"
            aria-controls="draw-controls-panel"
            :aria-label="drawControlsOpen ? 'Hide draw controls' : 'Show draw controls'"
            @click="toggleDrawControls"
          >
            {{ drawControlsOpen ? "Hide" : "Show" }}
            <component
              :is="drawControlsOpen ? ChevronUpIcon : ChevronDownIcon"
              class="h-5 w-5"
              aria-hidden="true"
            />
          </button>
        </div>

        <div
          id="draw-controls-panel"
          :class="drawControlsOpen ? 'block' : 'hidden lg:block'"
        >
          <div class="mt-4 grid grid-cols-3 gap-2 lg:grid-cols-1" role="group" aria-label="Draw mode">
            <button
              v-for="option in modes"
              :key="option.id"
              type="button"
              class="min-h-16 min-w-0 rounded-2xl border px-1.5 py-3 text-left transition-all lg:px-4"
              :class="
                mode === option.id
                  ? 'rounded-[1.5rem_1.5rem_1.5rem_0.65rem] border-transparent bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
              "
              :aria-pressed="mode === option.id"
              :disabled="revealInProgress"
              @click="updateMode(option.id)"
            >
              <span class="block break-words text-center text-[0.7rem] font-bold leading-4 sm:text-xs lg:text-left lg:text-sm">
                {{ option.label }}
              </span>
              <span class="mt-1 hidden text-xs leading-4 opacity-80 lg:block">
                {{ option.description }}
              </span>
            </button>
          </div>

          <div class="mt-5 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
            <div class="flex items-center justify-between gap-3">
              <p class="m3-label">ACTIVE FILTERS</p>
              <button
                type="button"
                class="m3-button m3-button--text min-h-8 px-2 py-1 text-xs"
                @click="store.openOptions()"
              >
                Edit
              </button>
            </div>
            <div v-if="filterChips.length" class="mt-3 flex flex-wrap gap-2">
              <span v-for="chip in filterChips" :key="chip" class="m3-chip">
                {{ chip }}
              </span>
            </div>
            <p v-else class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]">
              Open draw. Every legal card is in play.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="m3-button m3-button--filled m3-button--large fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-20 shadow-[var(--md-sys-elevation-3)] sm:relative sm:inset-auto sm:mt-6 sm:flex sm:w-full"
          :disabled="isLoading"
          @click="handleRandomize"
        >
          <ArrowPathIcon class="h-5 w-5" aria-hidden="true" />
          {{ isLoading ? "Shuffling..." : "Randomize" }}
        </button>
      </aside>

      <section
        class="relative min-w-0 overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large)] bg-[var(--md-sys-color-surface-container-lowest)] p-3 shadow-[var(--md-sys-elevation-1)] sm:p-6"
        aria-label="Randomizer result"
      >
        <DrawBackdrop
          :cards="backdropCards"
          :simplified="performance.simplifyBackdrop"
          :ambient="display.showAmbient"
        />

        <div class="relative z-10">
          <div
            v-if="revealInProgress"
            class="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-[var(--md-sys-color-inverse-surface)] px-4 py-3 text-[var(--md-sys-color-inverse-on-surface)]"
            role="status"
            aria-live="polite"
          >
            <span class="flex items-center gap-2 text-sm font-semibold">
              <SparklesIcon class="h-5 w-5" aria-hidden="true" />
              Revealing your pull
            </span>
            <button
              type="button"
              class="m3-button min-h-9 bg-[var(--md-sys-color-inverse-on-surface)] px-4 py-1.5 text-xs text-[var(--md-sys-color-inverse-surface)]"
              @click="skipReveal"
            >
              Skip reveal
            </button>
          </div>

          <ChoiceOptionsSection
            v-if="isChoiceMode && choices.length"
            :choices="choices"
            :is-loading="isLoading || revealInProgress"
            :show-links="display.showLinks && revealComplete"
            :can-randomize-choice-partner="canRandomizeChoicePartner"
            :on-choice-partner="handleChoicePartner"
            :get-partner-button-label="store.getPartnerButtonLabel"
            :reveal-active="isRevealActive"
            :reveal-complete="revealComplete"
            :reveal-duration-ms="REVEAL_TOTAL_MS"
          />
          <HeroStage
            v-else
            :hero-card-name="heroTitle"
            :hero-subtitle="heroSubtitle"
            :hero-cards="heroCards"
            :hero-scryfall-url="heroScryfallUrl"
            :hero-edhrec-url="heroEdhrecUrl"
            :show-links="display.showLinks && revealComplete"
            :mode="mode"
            :reveal-active="isRevealActive"
            :reveal-complete="revealComplete"
            :reveal-duration-ms="REVEAL_TOTAL_MS"
          />

          <div
            v-if="errorMessage"
            class="mt-4 flex items-start gap-3 rounded-2xl bg-[var(--md-sys-color-error-container)] px-4 py-3 text-sm text-[var(--md-sys-color-on-error-container)]"
            role="alert"
          >
            <span class="font-bold">Draw failed.</span>
            <span>{{ errorMessage }}</span>
          </div>

          <div
            v-if="revealComplete && hasResults && !isChoiceMode"
            class="mt-4 flex flex-wrap items-center justify-center gap-2 border-t border-[var(--md-sys-color-outline-variant)] pt-4"
          >
            <button
              v-if="showHeroCompanion"
              type="button"
              class="m3-button m3-button--tonal"
              :disabled="isLoading"
              @click="handleHeroCompanion"
            >
              <SparklesIcon class="h-5 w-5" aria-hidden="true" />
              {{ heroCompanionButtonLabel }}
            </button>
            <button
              type="button"
              class="m3-button m3-button--outlined"
              :disabled="store.isCurrentSaved"
              @click="store.saveCurrent()"
            >
              <BookmarkIcon class="h-5 w-5" aria-hidden="true" />
              {{ store.isCurrentSaved ? "Pull kept" : "Keep pull" }}
            </button>
          </div>
        </div>
      </section>

      <aside
        class="m3-card m3-card--filled min-w-0 p-4 lg:col-start-2 xl:col-start-3 xl:row-start-1 xl:sticky xl:top-8 xl:p-5"
        aria-labelledby="inspiration-title"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-[1rem_1rem_1rem_0.35rem] bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]"
          >
            <LightBulbIcon class="h-5 w-5" aria-hidden="true" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="m3-label">EDHREC</p>
            <h2 id="inspiration-title" class="text-xl font-bold">Deck inspiration</h2>
            <p class="mt-1 text-sm text-[var(--md-sys-color-on-surface-variant)]">
              Themes and popularity arrive after the reveal.
            </p>
          </div>
        </div>

        <div v-if="!hasResults" class="mt-5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] p-4">
          <p class="text-sm font-semibold">Nothing drawn yet</p>
          <p class="mt-1 text-sm text-[var(--md-sys-color-on-surface-variant)]">
            Randomize a commander to open its deckbuilding context.
          </p>
        </div>

        <div
          v-else-if="isRevealActive || !revealComplete"
          class="mt-5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] p-4"
        >
          <p class="text-sm font-semibold">Waiting for the reveal</p>
          <p class="mt-1 text-sm text-[var(--md-sys-color-on-surface-variant)]">
            Inspiration stays hidden until the cards turn over.
          </p>
        </div>

        <div
          v-else-if="isChoiceMode"
          class="mt-5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)] p-4"
        >
          <p class="text-sm font-semibold">Compare your options first</p>
          <p class="mt-1 text-sm text-[var(--md-sys-color-on-surface-variant)]">
            Each choice includes direct Scryfall and EDHREC links.
          </p>
        </div>

        <div v-else class="mt-5">
          <button
            type="button"
            class="m3-button m3-button--tonal w-full justify-between"
            :aria-expanded="detailsOpen"
            aria-controls="result-details-panel"
            @click="toggleDetails"
          >
            <span>{{ detailsOpen ? "Hide details" : "Show details" }}</span>
            <component
              :is="detailsOpen ? ChevronUpIcon : ChevronDownIcon"
              class="h-5 w-5"
              aria-hidden="true"
            />
          </button>

          <Transition name="details-sheet">
            <div v-if="detailsOpen" id="result-details-panel" class="mt-4">
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
      </aside>
    </div>
  </section>
</template>
