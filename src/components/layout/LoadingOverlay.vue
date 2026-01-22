<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isLoading: boolean
}>()

const show = computed(() => props.isLoading)
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    leave-active-class="transition-opacity duration-150 ease-in"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm dark:bg-slate-950/50"
      role="status"
      aria-live="polite"
      aria-label="Loading cards"
    >
      <div class="flex flex-col items-center gap-4 rounded-2xl border border-slate-200/60 bg-white/95 px-8 py-6 shadow-2xl backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/95">
        <div class="relative h-12 w-12">
          <div class="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
          <div class="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-violet-600 dark:border-t-violet-400"></div>
        </div>
        <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Shuffling cards...
        </p>
      </div>
    </div>
  </Transition>
</template>
