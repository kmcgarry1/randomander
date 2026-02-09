<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useRandomanderStore, viewNavItems } from "../stores/randomander";
import type { ViewKey } from "../stores/randomander";
import DrawView from "../features/draw/DrawView.vue";
import HistoryView from "../features/history/HistoryView.vue";
import SavedView from "../features/saved/SavedView.vue";
import SettingsView from "../features/settings/SettingsView.vue";
import OptionsModal from "../components/layout/OptionsModal.vue";
import LoadingOverlay from "../components/layout/LoadingOverlay.vue";
import { useTheme } from "../composables/useTheme";

useTheme();

const store = useRandomanderStore();
const { view, isOptionsOpen, isLoading, display } = storeToRefs(store);

const selectView = (next: ViewKey) => {
  store.view = next;
};

const openOptions = () => {
  store.openOptions();
};
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden antialiased text-slate-900 dark:text-slate-100"
  >
    <div
      v-if="display.showAmbient"
      class="pointer-events-none absolute inset-0 opacity-60 dark:opacity-70"
      aria-hidden="true"
    >
      <div
        class="motion-ambient absolute -left-20 top-10 h-48 w-48 rounded-full bg-amber-300/40 blur-3xl"
      ></div>
      <div
        class="motion-ambient motion-ambient-slow absolute right-10 top-20 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl"
      ></div>
      <div
        class="motion-ambient motion-ambient-slower absolute bottom-10 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-rose-300/20 blur-3xl"
      ></div>
    </div>

    <header
      class="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/60"
    >
      <div
        class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold uppercase tracking-[0.35em] text-white shadow-sm dark:bg-white dark:text-slate-900"
          >
            R
          </div>
          <div>
            <p
              class="text-[0.6rem] uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400"
            >
              Commander studio
            </p>
            <h1 class="font-heading text-lg text-slate-900 dark:text-white">
              Randomander
            </h1>
          </div>
        </div>

        <nav
          class="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 p-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-300 md:flex"
        >
          <button
            v-for="item in viewNavItems"
            :key="item.id"
            type="button"
            class="motion-nav motion-press rounded-full px-4 py-2 transition"
            :class="
              view === item.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'hover:text-slate-900 dark:hover:text-white'
            "
            @click="selectView(item.id)"
          >
            {{ item.label }}
          </button>
        </nav>

        <div class="flex items-center gap-2">
          <button
            v-if="view === 'draw'"
            type="button"
            class="motion-press hidden rounded-full border border-amber-200/80 bg-amber-100/80 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-900 shadow-sm transition hover:bg-amber-200/80 dark:border-amber-300/40 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:bg-amber-300/20 sm:inline-flex"
            @click="openOptions"
          >
            Filters
          </button>
          <span
            class="hidden text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-400 sm:inline"
          >
            {{ view }}
          </span>
        </div>
      </div>
    </header>

    <div class="relative z-10">
      <main
        class="motion-fade-up mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:pb-24"
      >
        <div class="flex min-h-full flex-col gap-6">
          <DrawView v-if="view === 'draw'" />
          <HistoryView v-else-if="view === 'history'" />
          <SavedView v-else-if="view === 'saved'" />
          <SettingsView v-else />
        </div>
      </main>
    </div>

    <div
      class="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none sm:hidden"
    >
      <div
        class="pointer-events-auto w-full max-w-3xl rounded-[2rem] border border-slate-200/70 bg-white/85 px-3 py-3 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/75"
      >
        <nav class="flex gap-2" aria-label="Primary">
          <button
            v-for="item in viewNavItems"
            :key="item.id"
            type="button"
            class="motion-press flex-1 rounded-[1.25rem] px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25em] transition"
            :class="
              view === item.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white/60 text-slate-600 hover:text-slate-900 dark:bg-slate-900/60 dark:text-slate-300'
            "
            @click="selectView(item.id)"
          >
            {{ item.label }}
          </button>
        </nav>
      </div>
    </div>

    <OptionsModal v-if="isOptionsOpen" />
    <LoadingOverlay :is-loading="isLoading" />
  </div>
</template>
