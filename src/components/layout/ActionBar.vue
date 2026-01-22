<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRandomanderStore } from '../../stores/randomander'

const store = useRandomanderStore()
const { isLoading, isChoiceMode, canRandomizePartner, partnerButtonLabel, hasResults } =
  storeToRefs(store)

const randomizeLabel = computed(() => {
  if (isLoading.value) return 'Shuffling...'
  return isChoiceMode.value ? 'Randomize choices' : 'Randomize'
})

const canSave = computed(() => hasResults.value && !isLoading.value)

const handleRandomize = () => {
  store.randomize()
}

const handleSave = () => {
  store.saveCurrent()
}

const handleOptions = () => {
  store.openOptions()
}

const handlePartner = () => {
  store.randomizePartnerForPrimary()
}
</script>

<template>
  <div
    class="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(92vw,560px)] -translate-x-1/2"
  >
    <div
      class="flex flex-wrap items-center justify-center gap-2 rounded-[1.75rem] border border-slate-200/70 bg-white/85 px-3 py-2 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75"
    >
      <button
        type="button"
        class="rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        :disabled="isLoading"
        @click="handleRandomize"
      >
        {{ randomizeLabel }}
      </button>
      <button
        type="button"
        class="rounded-full border border-slate-200/70 bg-white px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="handleOptions"
      >
        Options
      </button>
      <button
        type="button"
        class="rounded-full border border-violet-200/60 bg-violet-50/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-400/50 dark:bg-violet-500/15 dark:text-violet-100 dark:hover:bg-violet-500/25"
        :disabled="!canSave"
        @click="handleSave"
      >
        Save pull
      </button>
      <button
        v-if="canRandomizePartner && !isChoiceMode"
        type="button"
        class="rounded-full border border-violet-200/60 bg-white px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-400/50 dark:bg-slate-900 dark:text-violet-100 dark:hover:bg-slate-800"
        :disabled="isLoading"
        @click="handlePartner"
      >
        {{ partnerButtonLabel }}
      </button>
    </div>
  </div>
</template>
