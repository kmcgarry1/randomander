<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  COLOR_CHOICES,
  colorOptions,
  modes,
  useRandomanderStore,
  type ColorCount,
  type Mode,
} from '../../stores/randomander'
import { formatColorIdentity } from '../../lib/scryfall'

const store = useRandomanderStore()
const { mode, options } = storeToRefs(store)

const selectMode = (next: Mode) => {
  mode.value = next
}

const selectColorCount = (value: ColorCount) => {
  options.value.colorCount = value
}

const sortColors = (colors: string[]) =>
  COLOR_CHOICES.map((choice) => choice.symbol).filter((symbol) => colors.includes(symbol))

const toggleColor = (symbol: string) => {
  const next = new Set<string>(
    options.value.selectedColors.map((color: string) => color.toUpperCase())
  )
  if (next.has(symbol)) {
    next.delete(symbol)
  } else {
    next.add(symbol)
  }
  options.value.selectedColors = sortColors(Array.from(next))
}

const clearColors = () => {
  options.value.selectedColors = []
}

const colorSummary = computed(() =>
  options.value.selectedColors.length > 0
    ? formatColorIdentity(options.value.selectedColors)
    : 'Any'
)

const close = () => {
  store.closeOptions()
}

const resetFilters = () => {
  store.resetOptions()
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 px-4 py-6 backdrop-blur"
    @click.self="close"
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="options-title"
      class="w-full max-w-5xl max-h-[86vh] overflow-y-auto rounded-[2.5rem] border border-slate-200/80 bg-white/95 p-6 pb-12 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.55)] backdrop-blur sm:p-8 sm:pb-16 dark:border-slate-700/60 dark:bg-slate-900/90"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            class="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400"
          >
            Customization
          </p>
          <h2 id="options-title" class="font-heading text-2xl text-slate-900 dark:text-white">
            Randomizer options
          </h2>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Filters update here; navigation tabs above keep history, saved, and settings one tap away.
          </p>
        </div>
        <button
          type="button"
          class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:bg-slate-50 dark:border-slate-700/60 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Close options"
          @click="close"
        >
          Close
        </button>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section
          class="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Mode
          </p>
          <div class="mt-4 grid gap-3">
            <button
              v-for="item in modes"
              :key="item.id"
              type="button"
              class="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition"
              :class="
                mode === item.id
                  ? 'border-violet-500/60 bg-violet-500/10 text-violet-800 dark:text-violet-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              "
              @click="selectMode(item.id)"
            >
              <div>
                <p class="text-sm font-semibold">{{ item.label }}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.description }}</p>
              </div>
              <span
                class="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs"
                :class="
                  mode === item.id
                    ? 'border-violet-500/60 bg-violet-500 text-white'
                    : 'border-slate-200 text-slate-400 dark:border-slate-700/60 dark:text-slate-400'
                "
              >
                ✓
              </span>
            </button>
          </div>
        </section>

        <section
          class="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Color focus
          </p>
          <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Palette: <span class="font-semibold text-slate-900 dark:text-white">{{ colorSummary }}</span>
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="choice in COLOR_CHOICES"
              :key="choice.symbol"
              type="button"
              class="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition"
              :class="
                options.selectedColors.includes(choice.symbol)
                  ? choice.chip
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
              "
              :aria-pressed="options.selectedColors.includes(choice.symbol)"
              @click="toggleColor(choice.symbol)"
            >
              <i class="ms" :class="choice.icon"></i>
              {{ choice.name }}
            </button>
            <button
              type="button"
              class="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              @click="clearColors"
            >
              Clear
            </button>
          </div>
        </section>

        <section
          class="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            {{ store.colorLabel }}
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="option in colorOptions"
              :key="option.value"
              type="button"
              class="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition"
              :class="
                options.colorCount === option.value
                  ? 'border-violet-500/60 bg-violet-500/10 text-violet-800 dark:text-violet-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
              "
              @click="selectColorCount(option.value)"
            >
              {{ store.getColorOptionLabel(option) }}
            </button>
          </div>
        </section>
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-3">
        <section
          class="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Deck popularity
          </p>
          <div class="mt-4 space-y-3">
            <label class="flex items-center justify-between gap-3">
              <span class="text-sm text-slate-600 dark:text-slate-300">Limit by EDHREC decks</span>
              <input
                v-model="options.limitByDecks"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                :disabled="options.useRankCutoff || mode === 'spark'"
              />
            </label>
            <div class="flex items-center gap-3">
              <input
                v-model.number="options.maxDecks"
                type="number"
                min="100"
                step="100"
                class="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200"
                :disabled="!options.limitByDecks || options.useRankCutoff || mode === 'spark'"
              />
              <p class="text-xs text-slate-500 dark:text-slate-400">Decks or fewer</p>
            </div>
            <label class="flex items-center justify-between gap-3">
              <span class="text-sm text-slate-600 dark:text-slate-300">Skip top 10% (EDHREC rank)</span>
              <input
                v-model="options.useRankCutoff"
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                :disabled="mode === 'spark'"
              />
            </label>
          </div>
        </section>

        <section
          class="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Choice mode
          </p>
          <label class="mt-3 flex items-center justify-between gap-3">
            <span class="text-sm text-slate-600 dark:text-slate-300">{{ store.choiceLabel }}</span>
            <input
              v-model="options.twoChoices"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              :disabled="mode === 'spark'"
            />
          </label>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Spark draws always return a trio of cards.
          </p>
        </section>

        <section
          class="rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Spark extras
          </p>
          <label class="mt-3 flex items-center justify-between gap-3">
            <span class="text-sm text-slate-600 dark:text-slate-300">Exclude Game Changers</span>
            <input
              v-model="options.excludeGameChangers"
              type="checkbox"
              class="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
              :disabled="mode !== 'spark'"
            />
          </label>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Applies only to 3-card spark mode.
          </p>
        </section>
      </div>

      <div class="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-700/60">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            class="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
            @click="resetFilters"
          >
            Reset filters
          </button>
          <button
            type="button"
            class="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:w-auto"
            @click="close"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
