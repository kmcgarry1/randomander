<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import {
  AUTOMATED_EDHREC_METADATA_ENABLED,
  COLOR_CHOICES,
  colorOptions,
  modes,
  useRandomanderStore,
  type ColorCount,
  type Mode,
} from "../../stores/randomander";
import { formatColorIdentity } from "../../lib/scryfall";
import ScryfallSymbol from "../mtg/ScryfallSymbol.vue";
import { useModalFocus } from "../../composables/useModalFocus";

const store = useRandomanderStore();
const { mode, options } = storeToRefs(store);
const colorComparisonOptions: Array<{
  label: string;
  value: "up-to" | "exactly";
  description: string;
}> = [
  {
    label: "Up to",
    value: "up-to",
    description: "Allow up to the selected color count.",
  },
  {
    label: "Exactly",
    value: "exactly",
    description: "Require the selected color count.",
  },
];

const selectMode = (next: Mode) => {
  mode.value = next;
};

const selectColorCount = (value: ColorCount) => {
  options.value.colorCount = value;
};

const sortColors = (colors: string[]) =>
  COLOR_CHOICES.map((choice) => choice.symbol).filter((symbol) =>
    colors.includes(symbol),
  );

const toggleColor = (symbol: string) => {
  if (symbol === "C") {
    options.value.selectedColors = options.value.selectedColors.includes("C")
      ? []
      : ["C"];
    return;
  }

  const next = new Set<string>(
    options.value.selectedColors.map((color: string) => color.toUpperCase()),
  );
  next.delete("C");
  if (next.has(symbol)) {
    next.delete(symbol);
  } else {
    next.add(symbol);
  }
  options.value.selectedColors = sortColors(Array.from(next));
};

const clearColors = () => {
  options.value.selectedColors = [];
};

const colorSummary = computed(() =>
  options.value.selectedColors.length > 0
    ? formatColorIdentity(options.value.selectedColors)
    : "Any",
);

const close = () => {
  store.closeOptions();
};

const dialogRef = ref<HTMLElement | null>(null);

const resetFilters = () => {
  store.resetOptions();
};

useModalFocus(dialogRef, close, {
  initialTarget: () => dialogRef.value,
  restoreTarget: () =>
    document.querySelector<HTMLElement>('[data-options-invoker="true"]'),
});
</script>

<template>
  <div
    class="motion-overlay fixed inset-0 z-50 flex items-end justify-center bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_42%,transparent)] sm:items-center sm:p-6"
    @click.self="close"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      aria-labelledby="options-title"
      tabindex="-1"
      class="motion-modal flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[var(--md-sys-shape-corner-extra-large)] bg-[var(--md-sys-color-surface-container-low)] text-[var(--md-sys-color-on-surface)] shadow-[var(--md-sys-elevation-3)] sm:max-h-[88dvh] sm:max-w-5xl sm:rounded-[var(--md-sys-shape-corner-extra-large)] sm:border sm:border-[var(--md-sys-color-outline-variant)]"
    >
      <div
        class="mx-auto mt-2 h-1 w-8 rounded-full bg-[var(--md-sys-color-outline)] sm:hidden"
        aria-hidden="true"
      ></div>

      <header class="flex items-start gap-4 px-5 pb-4 pt-5 sm:px-8 sm:pt-7">
        <span
          class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[var(--md-sys-shape-corner-large)] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] sm:inline-flex"
          aria-hidden="true"
        >
          <AdjustmentsHorizontalIcon class="h-6 w-6" />
        </span>
        <div class="min-w-0 flex-1">
          <h2 id="options-title" class="font-heading text-2xl leading-tight sm:text-3xl">
            Randomizer options
          </h2>
        </div>
        <button
          type="button"
          class="m3-icon-button -mr-2 -mt-2"
          aria-label="Close options"
          @click="close"
        >
          <XMarkIcon class="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      <div class="overflow-y-auto overscroll-contain px-4 pb-6 sm:px-8">
        <section class="m3-card m3-card--filled p-4 sm:p-5">
          <h3 class="text-base font-semibold">Mode</h3>
          <div class="mt-4 grid gap-2 md:grid-cols-3">
            <button
              v-for="item in modes"
              :key="item.id"
              type="button"
              class="motion-press flex min-h-20 items-center gap-3 rounded-[var(--md-sys-shape-corner-large)] border px-4 py-3 text-left transition-colors"
              :class="
                mode === item.id
                  ? 'border-transparent bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]'
                  : 'border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)]'
              "
              :aria-pressed="mode === item.id"
              @click="selectMode(item.id)"
            >
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                :class="
                  mode === item.id
                    ? 'border-transparent bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]'
                    : 'border-[var(--md-sys-color-outline)] text-transparent'
                "
                aria-hidden="true"
              >
                <CheckIcon class="h-4 w-4" />
              </span>
              <span class="min-w-0">
                <span class="block text-sm font-semibold">{{ item.label }}</span>
                <span
                  class="mt-0.5 block text-xs leading-5"
                  :class="
                    mode === item.id
                      ? 'text-[var(--md-sys-color-on-primary-container)]'
                      : 'text-[var(--md-sys-color-on-surface-variant)]'
                  "
                >
                  {{ item.description }}
                </span>
              </span>
            </button>
          </div>
        </section>

        <div class="mt-4 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
          <section class="m3-card p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 class="text-base font-semibold">Color focus</h3>
              </div>
              <p
                class="rounded-full bg-[var(--md-sys-color-secondary-container)] px-3 py-1.5 text-xs font-semibold text-[var(--md-sys-color-on-secondary-container)]"
                aria-live="polite"
              >
                {{ colorSummary }}
              </p>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button
                v-for="choice in COLOR_CHOICES"
                :key="choice.symbol"
                type="button"
                class="m3-chip min-h-11"
                :aria-pressed="options.selectedColors.includes(choice.symbol)"
                @click="toggleColor(choice.symbol)"
              >
                <ScryfallSymbol
                  :symbol="choice.symbol"
                  decorative
                  class="text-lg"
                />
                {{ choice.name }}
              </button>
              <button
                type="button"
                class="m3-button m3-button--text min-h-11 px-3"
                @click="clearColors"
              >
                <XMarkIcon class="h-4 w-4" aria-hidden="true" />
                Clear colors
              </button>
            </div>
          </section>

          <section class="m3-card p-4 sm:p-5">
            <h3 class="text-base font-semibold">Comparison</h3>
            <div class="m3-segmented mt-4" role="group" aria-label="Color comparison">
              <button
                v-for="comparison in colorComparisonOptions"
                :key="comparison.value"
                type="button"
                class="m3-segmented__button px-2"
                :aria-pressed="options.colorCountMode === comparison.value"
                :title="comparison.description"
                @click="options.colorCountMode = comparison.value"
              >
                <span class="inline-flex items-center justify-center gap-1.5">
                  <CheckIcon
                    v-if="options.colorCountMode === comparison.value"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  {{ comparison.label }}
                </span>
              </button>
            </div>
            <p class="mt-3 text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]">
              {{ store.colorComparisonDescription }}
            </p>
          </section>
        </div>

        <section class="m3-card mt-4 p-4 sm:p-5">
          <h3 class="text-base font-semibold">{{ store.colorLabel }}</h3>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="option in colorOptions"
              :key="option.value"
              type="button"
              class="m3-chip min-h-11 px-4"
              :aria-pressed="options.colorCount === option.value"
              @click="selectColorCount(option.value)"
            >
              <CheckIcon
                v-if="options.colorCount === option.value"
                class="h-4 w-4"
                aria-hidden="true"
              />
              {{ store.getColorOptionLabel(option) }}
            </button>
          </div>
          <p
            v-if="store.colorFilterProblem"
            role="alert"
            class="mt-4 rounded-[var(--md-sys-shape-corner-medium)] bg-[var(--md-sys-color-error-container)] px-3 py-2 text-sm text-[var(--md-sys-color-on-error-container)]"
          >
            {{ store.colorFilterProblem }}
          </p>
        </section>

        <div class="mt-4 grid gap-4 lg:grid-cols-3">
          <section class="m3-card m3-card--filled p-4 sm:p-5">
            <h3 class="text-base font-semibold">Deck popularity</h3>
            <div class="mt-4 space-y-4">
              <label
                v-if="AUTOMATED_EDHREC_METADATA_ENABLED"
                class="flex min-h-12 items-center justify-between gap-4"
              >
                <span class="text-sm">Limit by EDHREC decks</span>
                <input
                  v-model="options.limitByDecks"
                  type="checkbox"
                  class="m3-switch"
                  :disabled="options.useRankCutoff || mode === 'spark'"
                />
              </label>
              <label
                v-if="AUTOMATED_EDHREC_METADATA_ENABLED"
                class="block"
                for="max-edhrec-decks"
              >
                <span class="m3-label">Deck count below</span>
                <span class="mt-1 flex items-center gap-3">
                  <input
                    id="max-edhrec-decks"
                    v-model.number="options.maxDecks"
                    type="number"
                    min="100"
                    step="100"
                    class="m3-field max-w-32"
                    :disabled="
                      !options.limitByDecks ||
                      options.useRankCutoff ||
                      mode === 'spark'
                    "
                  />
                  <span class="text-xs text-[var(--md-sys-color-on-surface-variant)]">
                    decks
                  </span>
                </span>
              </label>
              <label class="flex min-h-12 items-center justify-between gap-4">
                <span class="text-sm">Skip top 10% (EDHREC rank)</span>
                <input
                  v-model="options.useRankCutoff"
                  type="checkbox"
                  class="m3-switch"
                  :disabled="mode === 'spark'"
                />
              </label>
              <p
                v-if="!AUTOMATED_EDHREC_METADATA_ENABLED"
                class="text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]"
              >
                Direct EDHREC deck-count requests are disabled. Ranked sampling
                uses Scryfall's EDHREC ordering and does not contact EDHREC.
              </p>
            </div>
          </section>

          <section class="m3-card p-4 sm:p-5">
            <h3 class="text-base font-semibold">Choice mode</h3>
            <label class="mt-4 flex min-h-12 items-center justify-between gap-4">
              <span class="text-sm">{{ store.choiceLabel }}</span>
              <input
                v-model="options.twoChoices"
                type="checkbox"
                class="m3-switch"
                :disabled="mode === 'spark'"
              />
            </label>
            <p
              v-if="mode === 'spark'"
              class="mt-2 text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]"
            >
              Spark mode always draws three cards.
            </p>
          </section>

          <section class="m3-card p-4 sm:p-5">
            <h3 class="text-base font-semibold">Spark extras</h3>
            <label class="mt-4 flex min-h-12 items-center justify-between gap-4">
              <span class="text-sm">Exclude Game Changers</span>
              <input
                v-model="options.excludeGameChangers"
                type="checkbox"
                class="m3-switch"
                :disabled="mode !== 'spark'"
              />
            </label>
          </section>
        </div>
      </div>

      <footer
        class="flex flex-col-reverse gap-2 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:flex-row sm:justify-end sm:px-8 sm:pb-5"
      >
        <button
          type="button"
          class="m3-button m3-button--text w-full sm:w-auto"
          @click="resetFilters"
        >
          <ArrowPathIcon class="h-5 w-5" aria-hidden="true" />
          Reset filters
        </button>
        <button
          type="button"
          class="m3-button m3-button--filled w-full sm:w-auto sm:min-w-28"
          @click="close"
        >
          Done
        </button>
      </footer>
    </div>
  </div>
</template>
