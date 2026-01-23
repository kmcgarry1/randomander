<script setup lang="ts">
import { computed } from "vue";
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
const { view, isOptionsOpen, isLoading } = storeToRefs(store);

const isDrawView = computed(() => view.value === "draw");

const handleRandomize = () => {
  store.randomize();
};

const goToHistory = () => {
  store.view = "history";
};

const handleOptions = () => {
  store.openOptions();
};

const toggleSettings = () => {
  view.value = view.value === "settings" ? "draw" : "settings";
};

const selectView = (next: ViewKey) => {
  store.view = next;
};
</script>

<template>
  <div
    class="relative min-h-screen overflow-hidden antialiased text-slate-900 dark:text-slate-100"
  >
    <div class="relative z-10">
      <main
        class="h-screen w-full max-w-6xl px-4 mx-auto sm:h-auto sm:overflow-visible sm:px-4 sm:pb-0 overflow-y-auto"
      >
        <div class="flex min-h-full flex-col pb-40 sm:pb-32">
          <DrawView v-if="view === 'draw'" />
          <HistoryView v-else-if="view === 'history'" />
          <SavedView v-else-if="view === 'saved'" />
          <SettingsView v-else />
        </div>
      </main>
    </div>

    <div
      v-if="isDrawView"
      class="fixed inset-x-0 z-40 justify-center hidden pointer-events-none bottom-6 sm:flex"
    >
      <div
        class="flex items-center gap-3 px-3 py-2 text-sm font-semibold text-white rounded-full shadow-lg pointer-events-auto bg-slate-900/80 shadow-slate-900/40 backdrop-blur dark:bg-white/10 dark:text-slate-100"
      >
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Randomize"
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
            class="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M4 6h5l4 4-4 4H4"></path>
            <path d="M16 6h4v4"></path>
            <path d="M20 14h-4l-4 4 4 4h4"></path>
          </svg>
          {{ isLoading ? "Shuffling..." : "Randomize" }}
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-white/70"
          aria-label="Options"
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
            class="w-4 h-4"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            ></path>
          </svg>
          Filters
        </button>
        <button
          type="button"
          class="flex items-center gap-2 rounded-full border border-white/40 px-4 py-2 text-xs uppercase tracking-[0.3em] transition hover:border-white/70"
          @click="goToHistory"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-4 h-4"
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

    <div
      class="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none sm:hidden"
    >
      <div
        class="pointer-events-auto w-full max-w-3xl rounded-[2rem] border border-slate-200/70 bg-white/90 p-4 shadow-[0_20px_45px_-15px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
      >
        <div v-if="isDrawView" class="space-y-3">
          <button
            type="button"
            class="w-full rounded-[1.5rem] bg-purple-600 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-purple-300"
            aria-label="Randomize"
            :disabled="isLoading"
            @click="handleRandomize"
          >
            {{ isLoading ? "Shuffling…" : "Randomize" }}
          </button>
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 rounded-[1.5rem] border border-slate-200 bg-white px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Open filters"
              @click="handleOptions"
            >
              Filters
            </button>
            <button
              type="button"
              class="flex-1 rounded-[1.5rem] border border-slate-200 bg-white px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label="Open history"
              @click="selectView('history')"
            >
              History
            </button>
          </div>
        </div>
        <nav class="flex gap-2 mt-2">
          <button
            v-for="item in viewNavItems"
            :key="item.id"
            type="button"
            class="flex-1 rounded-[1.25rem] px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.25em] transition"
            :class="
              view === item.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-white/70 text-slate-600 hover:text-slate-900 dark:bg-slate-900/70 dark:text-slate-300'
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

    <button
      type="button"
      class="fixed z-50 hidden p-3 text-white transition border rounded-full shadow-lg sm:block right-4 top-4 border-white/40 bg-slate-900/60 shadow-slate-900/40 hover:border-white/70 hover:bg-slate-900 dark:border-slate-100/40 dark:bg-slate-900/80 dark:text-white"
      aria-label="Toggle settings"
      @click="toggleSettings"
    >
      <svg
        v-if="view !== 'settings'"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-5 h-5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3.5"></circle>
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        ></path>
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-5 h-5"
        aria-hidden="true"
      >
        <path d="M18 6L6 18M6 6l12 12"></path>
      </svg>
    </button>
  </div>
</template>
