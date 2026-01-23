<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useRandomanderStore, modes } from '../../stores/randomander'
import { formatColorIdentity, getCardImageUrl } from '../../lib/scryfall'
import type { PullRecord } from '../../stores/randomander'

const store = useRandomanderStore()
const { saved } = storeToRefs(store)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const getModeLabel = (mode: PullRecord['mode']) =>
  modes.find((item) => item.id === mode)?.label ?? 'Commander'

const buildSummary = (record: PullRecord) => {
  const chips: string[] = []
  chips.push(getModeLabel(record.mode))
  if (record.options.selectedColors.length) {
    chips.push(formatColorIdentity(record.options.selectedColors))
  } else if (record.options.colorCount !== 'any') {
    chips.push(`Colors: ${record.options.colorCount}`)
  }
  if (record.mode === 'spark' && record.options.excludeGameChangers) {
    chips.push('No Game Changers')
  }
  if (record.options.useRankCutoff) {
    chips.push('Skip top 10%')
  }
  if (record.options.limitByDecks && !record.options.useRankCutoff) {
    chips.push(`Decks < ${record.options.maxDecks}`)
  }
  return chips
}

const getGroups = (record: PullRecord) =>
  record.choices?.length ? record.choices.map((choice) => choice.cards) : [record.cards]

const getGroupLabel = (cards: PullRecord['cards']) =>
  cards.map((card) => card.name).join(' + ')

const handleLoad = (record: PullRecord) => {
  store.loadRecord(record)
}

const handleRemove = (record: PullRecord) => {
  store.removeSaved(record.id)
}

const handleClear = () => {
  store.clearSaved()
}
</script>

<template>
  <section class="mt-6 space-y-6">
    <header
      class="sticky top-6 z-20 -mx-4 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/90 px-4 py-4 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6"
    >
      <div>
        <p class="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
          Favorites
        </p>
        <h2 class="font-heading text-2xl text-slate-900 dark:text-white">Saved pulls</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">
          Favorites are stored locally for quick recall.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          :disabled="saved.length === 0"
          @click="handleClear"
        >
          Clear saved
        </button>
        <span class="text-[0.65rem] font-semibold text-slate-500 dark:text-slate-400">
          Clean slate for new favorites
        </span>
      </div>
    </header>

    <div v-if="saved.length === 0" class="rounded-3xl border border-slate-200/80 bg-white/80 p-10 text-center dark:border-slate-700/60 dark:bg-slate-900/80">
      <p class="font-heading text-xl text-slate-900 dark:text-white">No saved pulls yet.</p>
      <p class="mt-2 text-sm text-slate-500 dark:text-slate-300">
        Save pulls from the draw screen to collect favorites.
      </p>
    </div>

    <div v-else class="grid gap-4">
      <article
        v-for="record in saved"
        :key="record.id"
        class="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {{ formatDate(record.createdAt) }}
            </p>
            <h3 class="font-heading text-lg text-slate-900 dark:text-white">
              {{ getModeLabel(record.mode) }}
            </h3>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="rounded-full bg-violet-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-violet-500"
              @click="handleLoad(record)"
            >
              Load
            </button>
            <button
              type="button"
              class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20"
              @click="handleRemove(record)"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="chip in buildSummary(record)"
            :key="chip"
            class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300"
          >
            {{ chip }}
          </span>
        </div>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div
            v-for="(group, index) in getGroups(record)"
            :key="`${record.id}-${index}`"
            class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-700/60 dark:bg-slate-900/60"
          >
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {{ record.choices?.length ? `Option ${index + 1}` : 'Pull' }}
            </p>
            <div class="mt-3 flex items-center gap-3">
              <div class="flex -space-x-3">
                <img
                  v-for="card in group"
                  :key="card.id"
                  :src="getCardImageUrl(card)"
                  :alt="card.name"
                  class="h-12 w-9 rounded-lg border border-white object-cover shadow-sm dark:border-slate-800"
                  loading="lazy"
                />
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {{ getGroupLabel(group) }}
                </p>
                <p class="text-xs text-slate-500 dark:text-slate-400">
                  {{ group.length }} card{{ group.length === 1 ? '' : 's' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
