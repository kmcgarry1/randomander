<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRandomanderStore } from '../../stores/randomander'

const store = useRandomanderStore()
const { isLoading, isChoiceMode } = storeToRefs(store)

const randomizeLabel = computed(() => {
  if (isLoading.value) return 'Shuffling...'
  return isChoiceMode.value ? 'Randomize choices' : 'Randomize'
})

const handleRandomize = () => {
  store.randomize()
}

const handleOptions = () => {
  store.openOptions()
}

const handleHistory = () => {
  store.view = 'history'
}
</script>

<template>
  <div
    class="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 w-[min(92vw,560px)] -translate-x-1/2"
  >
    <div class="flex flex-wrap items-center justify-center gap-3 p-1">
      <button
        type="button"
        class="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-violet-500 dark:hover:bg-violet-400"
        :disabled="isLoading"
        @click="handleRandomize"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M4 6h5l4 4-4 4H4"></path>
          <path d="M16 6h4v4"></path>
          <path d="M20 14h-4l-4 4 4 4h4"></path>
        </svg>
        {{ randomizeLabel }}
      </button>
      <button
        type="button"
        class="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        @click="handleOptions"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-3 w-3"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
          ></path>
        </svg>
        Options
      </button>
      <button
        type="button"
        class="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="handleHistory"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-3 w-3"
          aria-hidden="true"
        >
          <path d="M3 3v5h5M21 21v-5h-5"></path>
          <path d="M5 19a9 9 0 1 1 0-14"></path>
          <polyline points="16 8 12 12 9 9"></polyline>
        </svg>
        History
      </button>
    </div>
  </div>
</template>
