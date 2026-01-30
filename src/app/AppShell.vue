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
const { view, isOptionsOpen, isLoading } = storeToRefs(store);

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
      class="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none sm:hidden"
    >
      <div
        class="pointer-events-auto w-full max-w-3xl rounded-[2rem] border border-slate-200/70 bg-white/90 p-4 shadow-[0_20px_45px_-15px_rgba(15,23,42,0.7)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
      >
        <nav class="flex gap-2">
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
  </div>
</template>
