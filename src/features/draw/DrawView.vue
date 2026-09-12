<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { storeToRefs } from "pinia";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  BookmarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
} from "@heroicons/vue/24/outline";
import {
  MAX_SAVED,
  modes,
  type Mode,
  type PullRecord,
  useRandomanderStore,
} from "../../stores/randomander";
import {
  formatColorIdentity,
  getCardImageUrl,
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getSafeScryfallUrl,
  getPartnerKind,
  isBackgroundCard,
  type ScryfallCard,
} from "../../lib/scryfall";
import HeroStage from "./components/HeroStage.vue";
import ChoiceOptionsSection from "./components/ChoiceOptionsSection.vue";
import DrawBackdrop from "./components/DrawBackdrop.vue";
import { useHeroSummary } from "./composables/useHeroSummary";
import SavedCapacityDialog from "../saved/components/SavedCapacityDialog.vue";

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
  saved,
} = storeToRefs(store);

const {
  heroCard,
  heroCards,
  heroIsBackground,
  heroHasCompanionSlot,
  heroCompanionButtonLabel,
  heroGroup,
} = useHeroSummary();

const heroScryfallUrl = computed(() =>
  heroCard.value ? getSafeScryfallUrl(heroCard.value) ?? "" : "",
);
const getPairLinkUrl = (group: ScryfallCard[]) => {
  if (group.length !== 2) return "";
  const identifier = store.getPartnerSlugForGroup(group);
  return identifier
    ? `https://edhrec.com/commanders/${identifier}`
    : "";
};

const heroEdhrecUrl = computed(() =>
  heroGroup.value.length === 2
    ? getPairLinkUrl(heroGroup.value)
    : heroCard.value
      ? (isBackgroundCard(heroCard.value)
          ? getEdhrecCardUrl(heroCard.value)
          : getEdhrecCommanderUrl(heroCard.value)) ?? ""
      : "",
);

const heroTitle = computed(() =>
  heroGroup.value.length > 1
    ? heroGroup.value.map((card) => card.name).join(" + ")
    : heroCard.value?.name ?? "Your next commander",
);

const getRecordLabel = (record: PullRecord) => {
  const groups = record.choices?.length
    ? record.choices.map((choice) => choice.cards)
    : [record.cards];
  return groups
    .map((group) => group.map((card) => card.name).join(" + "))
    .join(" or ");
};

const oldestSavedLabel = computed(() => {
  const oldest = saved.value[saved.value.length - 1];
  return oldest ? getRecordLabel(oldest) : "the oldest saved pull";
});

const drawIssueTitle = computed(() => {
  if (/cancel/i.test(errorMessage.value)) return "Draw cancelled.";
  if (/timed?\s*out|timeout/i.test(errorMessage.value)) return "Draw timed out.";
  return "Draw failed.";
});

const drawIssueDetail = computed(() =>
  /cancel/i.test(errorMessage.value)
    ? "Your previous result is unchanged."
    : errorMessage.value,
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
const activeModeDescription = computed(
  () =>
    modes.find((option) => option.id === mode.value)?.description ??
    "One legal commander.",
);
const drawControlsOpen = ref(false);
const systemReducedMotion = ref(true);
const motionAvailable = ref(false);
const isRevealActive = ref(false);
const revealComplete = ref(false);
const saveCapacityDialogOpen = ref(false);
const actionAnnouncement = ref("");
const randomizeButtonRef = ref<HTMLButtonElement | null>(null);
let revealTimer: number | undefined;
let revealStartTimer: number | undefined;
let revealPreloadController: AbortController | undefined;
let revealRequestId = 0;
let handledResultKey = "";
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
};

const beginReveal = async () => {
  revealStartTimer = undefined;
  clearRevealTimer();
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

const openOptions = (event: MouseEvent) => {
  document
    .querySelectorAll<HTMLElement>('[data-options-invoker="true"]')
    .forEach((element) => element.removeAttribute("data-options-invoker"));
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.dataset.optionsInvoker = "true";
  }
  store.openOptions();
};

const handleRandomize = () => {
  if (revealInProgress.value) finishReveal();
  store.randomize();
};

const retryDraw = () => {
  randomizeButtonRef.value?.focus({ preventScroll: true });
  handleRandomize();
};

const announce = async (message: string) => {
  actionAnnouncement.value = "";
  await nextTick();
  actionAnnouncement.value = message;
};

const handleSave = async () => {
  if (store.isCurrentSaved) return;
  if (saved.value.length >= MAX_SAVED) {
    saveCapacityDialogOpen.value = true;
    return;
  }
  if (!store.saveCurrent()) return;
  await announce(`Saved ${heroTitle.value}.`);
  await nextTick();
  randomizeButtonRef.value?.focus({ preventScroll: true });
};

const confirmCapacitySave = async () => {
  const replacedLabel = oldestSavedLabel.value;
  const didSave = store.saveCurrent({ replaceOldest: true });
  saveCapacityDialogOpen.value = false;
  if (!didSave) return;
  await announce(
    `Saved ${heroTitle.value} and removed the oldest saved pull, ${replacedLabel}.`,
  );
  await nextTick();
  randomizeButtonRef.value?.focus({ preventScroll: true });
};

const handleChoicePartner = (index: number) => {
  if (!revealInProgress.value) store.randomizePartnerForChoice(index);
};

const canRandomizeChoicePartner = (card: ScryfallCard) =>
  isBackgroundCard(card) || getPartnerKind(card) !== null;

const handleHeroCompanion = () => {
  if (revealInProgress.value) return;
  if (heroIsBackground.value) store.randomizeCommanderForBackground();
  else store.randomizePartnerForPrimary();
};

const skipReveal = async () => {
  finishReveal();
  await nextTick();
  document
    .querySelector<HTMLElement>("[data-result-heading]")
    ?.focus({ preventScroll: true });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (
    event.key === "Escape" &&
    revealInProgress.value &&
    !document.querySelector('[aria-modal="true"]')
  ) {
    void skipReveal();
  }
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
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  syncMotionPreference();
  motionQuery.addEventListener?.("change", syncMotionPreference);
});

onBeforeUnmount(() => {
  revealRequestId += 1;
  clearRevealPreload();
  clearRevealStartTimer();
  clearRevealTimer();
  store.setMetadataSurfaceVisible(false);
  window.removeEventListener("keydown", handleKeydown);
  motionQuery?.removeEventListener?.("change", syncMotionPreference);
});

watch(activeResultKey, (key) => {
  revealRequestId += 1;
  clearRevealPreload();
  clearRevealStartTimer();
  clearRevealTimer();
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

</script>

<template>
  <section class="relative mx-auto w-full min-w-0 max-w-[100rem] px-3 py-4 sm:px-6 sm:py-8">
    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{ actionAnnouncement }}
    </p>
    <header class="mb-4 flex items-end justify-between gap-4 sm:mb-6 sm:gap-8">
      <div class="max-w-2xl">
        <h1 class="text-[clamp(1.65rem,7vw,3.15rem)] leading-[1.04] tracking-normal sm:leading-[1.02]">
          Find a deck worth building.
        </h1>
      </div>
      <button
        type="button"
        class="m3-button m3-button--tonal hidden shrink-0 sm:inline-flex"
        @click="openOptions"
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

    <div class="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:gap-5">
      <aside class="m3-card m3-card--filled min-w-0 overflow-hidden p-3 lg:sticky lg:top-8 lg:p-5">
        <div class="flex min-h-11 items-center justify-between gap-3 lg:block">
          <div class="min-w-0">
            <p class="m3-label">DRAW MODE</p>
            <div class="mt-1 flex min-w-0 items-center gap-2">
              <h2 class="min-w-0 break-words text-lg font-bold lg:text-xl">
                {{ activeModeLabel }}
              </h2>
              <span
                v-if="activeFilterCount"
                class="shrink-0 rounded-full bg-[var(--md-sys-color-secondary-container)] px-2 py-0.5 text-xs font-semibold text-[var(--md-sys-color-on-secondary-container)] lg:hidden"
              >
                {{ activeFilterCount }} filter{{ activeFilterCount === 1 ? "" : "s" }}
              </span>
            </div>
            <p
              class="mt-1 text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)] lg:hidden"
            >
              {{ activeModeDescription }}
            </p>
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
          <div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1" role="group" aria-label="Draw mode">
            <button
              v-for="option in modes"
              :key="option.id"
              type="button"
              class="min-h-16 min-w-0 border px-3 py-3 text-left transition-colors lg:px-4"
              :class="
                mode === option.id
                  ? 'border-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-on-surface)] shadow-[inset_0_-2px_0_var(--md-sys-color-primary)]'
                  : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
              "
              :aria-pressed="mode === option.id"
              :aria-label="option.label"
              :aria-describedby="`draw-mode-${option.id}-description`"
              :disabled="revealInProgress"
              @click="updateMode(option.id)"
            >
              <span class="block break-words text-sm font-bold leading-5">
                {{ option.label }}
              </span>
              <span
                :id="`draw-mode-${option.id}-description`"
                class="mt-1 block break-words text-xs leading-5 opacity-80"
              >
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
                @click="openOptions"
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
              No filters applied.
            </p>
          </div>
        </div>

        <button
          id="draw-randomize"
          ref="randomizeButtonRef"
          type="button"
          class="m3-button m3-button--filled m3-button--large fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-20 min-w-0 max-w-full flex-wrap px-4 sm:relative sm:inset-auto sm:mt-6 sm:flex sm:w-full sm:px-7"
          :disabled="isLoading"
          @click="handleRandomize"
        >
          <ArrowPathIcon class="h-5 w-5 shrink-0" aria-hidden="true" />
          <span class="min-w-0 break-words [overflow-wrap:anywhere]">
            {{ isLoading ? "Shuffling..." : "Randomize" }}
          </span>
        </button>
      </aside>

      <section
        class="relative min-w-0 overflow-hidden border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] p-3 sm:p-6"
        aria-label="Randomizer result"
      >
        <DrawBackdrop
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
            :price-provider="display.priceProvider"
            :can-randomize-choice-partner="canRandomizeChoicePartner"
            :on-choice-partner="handleChoicePartner"
            :get-partner-button-label="store.getPartnerButtonLabel"
            :get-pair-link-url="getPairLinkUrl"
            :reveal-active="isRevealActive"
            :reveal-complete="revealComplete"
            :reveal-duration-ms="REVEAL_TOTAL_MS"
          />
          <HeroStage
            v-else
            :hero-card-name="heroTitle"
            :hero-cards="heroCards"
            :hero-scryfall-url="heroScryfallUrl"
            :hero-edhrec-url="heroEdhrecUrl"
            :show-links="display.showLinks && revealComplete"
            :price-provider="display.priceProvider"
            :mode="mode"
            :reveal-active="isRevealActive"
            :reveal-complete="revealComplete"
            :reveal-duration-ms="REVEAL_TOTAL_MS"
          />

          <div
            v-if="errorMessage"
            class="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--md-sys-color-error-container)] px-4 py-3 text-sm text-[var(--md-sys-color-on-error-container)]"
            role="alert"
          >
            <div class="min-w-0 flex-1">
              <span class="font-bold">{{ drawIssueTitle }}</span>
              <span class="ml-1">{{ drawIssueDetail }}</span>
            </div>
            <button
              type="button"
              class="m3-button m3-button--outlined shrink-0"
              @click="retryDraw"
            >
              Try again
            </button>
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
              @click="handleSave"
            >
              <BookmarkIcon class="h-5 w-5" aria-hidden="true" />
              {{ store.isCurrentSaved ? "Pull saved" : "Save pull" }}
            </button>
          </div>
        </div>
      </section>

    </div>
    <SavedCapacityDialog
      v-if="saveCapacityDialogOpen"
      :target-label="heroTitle"
      :oldest-label="oldestSavedLabel"
      @cancel="saveCapacityDialogOpen = false"
      @confirm="confirmCapacitySave"
    />
  </section>
</template>
