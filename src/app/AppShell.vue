<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRandomanderStore, type ViewKey } from '../stores/randomander'
import DrawView from '../features/draw/DrawView.vue'
import HistoryView from '../features/history/HistoryView.vue'
import SavedView from '../features/saved/SavedView.vue'
import SettingsView from '../features/settings/SettingsView.vue'
import OptionsModal from '../components/layout/OptionsModal.vue'
import ActionBar from '../components/layout/ActionBar.vue'
import LoadingOverlay from '../components/layout/LoadingOverlay.vue'
import { useTheme } from '../composables/useTheme'

useTheme()

const store = useRandomanderStore()
const { view, display, isOptionsOpen, isFirstLoad, isLoading } = storeToRefs(store)

const navItems: Array<{ id: ViewKey; label: string; description: string }> = [
  { id: 'draw', label: 'Draw', description: 'Randomizer' },
  { id: 'history', label: 'History', description: 'Recent pulls' },
  { id: 'saved', label: 'Saved', description: 'Favorites' },
  { id: 'settings', label: 'Settings', description: 'Preferences' },
]

const showActionBar = computed(() => view.value === 'draw' && !isFirstLoad.value)

const setView = (next: ViewKey) => {
  view.value = next
}

const openOptions = () => {
  store.openOptions()
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden text-slate-900 antialiased dark:text-slate-100">
    <template v-if="display.showAmbient">
      <div
        class="pointer-events-none absolute -top-28 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-violet-300/30 blur-3xl animate-[float_16s_ease-in-out_infinite] dark:bg-violet-500/20"
      ></div>
      <div
        class="pointer-events-none absolute -right-32 top-32 h-[280px] w-[280px] rounded-full bg-sky-300/30 blur-3xl animate-[float_22s_ease-in-out_infinite] dark:bg-sky-500/15"
      ></div>
      <div
        class="pointer-events-none absolute -left-24 bottom-24 h-[260px] w-[260px] rounded-full bg-amber-200/35 blur-3xl animate-[float_18s_ease-in-out_infinite] dark:bg-amber-400/10"
      ></div>
    </template>

    <div class="relative z-10">
      <header class="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-4 pb-6 pt-8 sm:pt-10">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-base font-semibold text-white shadow-md shadow-violet-500/25">
            R
          </div>
          <div>
            <p class="text-[0.6rem] uppercase tracking-[0.28em] text-slate-400 dark:text-slate-500">
              Commander lab
            </p>
            <p class="text-xl font-semibold text-slate-900 dark:text-white">Randomander</p>
          </div>
        </div>

        <nav class="flex flex-1 justify-center" aria-label="Primary">
          <div class="flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200/60 bg-white/70 px-2 py-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-500 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300">
            <button
              v-for="item in navItems"
              :key="item.id"
              type="button"
              class="rounded-full px-3.5 py-1.5 transition"
              :class="
                view === item.id
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'text-slate-500 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-slate-800'
              "
              :aria-current="view === item.id ? 'page' : undefined"
              @click="setView(item.id)"
            >
              {{ item.label }}
            </button>
          </div>
        </nav>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
            @click="openOptions"
          >
            <span class="sr-only">Open controls</span>
            <span class="inline-flex items-center gap-2">
              <span class="flex h-2.5 w-2.5 flex-col justify-between">
                <span class="block h-0.5 w-full rounded-full bg-current"></span>
                <span class="block h-0.5 w-full rounded-full bg-current"></span>
                <span class="block h-0.5 w-full rounded-full bg-current"></span>
              </span>
              Controls
            </span>
          </button>
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl px-4 pb-32">
        <DrawView v-if="view === 'draw'" />
        <HistoryView v-else-if="view === 'history'" />
        <SavedView v-else-if="view === 'saved'" />
        <SettingsView v-else />
      </main>
    </div>

    <ActionBar v-if="showActionBar" />
    <OptionsModal v-if="isOptionsOpen" />
    <LoadingOverlay :is-loading="isLoading" />
  </div>
</template>
