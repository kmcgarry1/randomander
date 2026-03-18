<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRandomanderStore } from "../stores/randomander";
import DrawView from "../features/draw/DrawView.vue";
import HistoryView from "../features/history/HistoryView.vue";
import SavedView from "../features/saved/SavedView.vue";
import SettingsView from "../features/settings/SettingsView.vue";
import OptionsModal from "../components/layout/OptionsModal.vue";
import LoadingOverlay from "../components/layout/LoadingOverlay.vue";
import SupportPanel from "../components/layout/SupportPanel.vue";
import { useTheme } from "../composables/useTheme";

useTheme();

const store = useRandomanderStore();
const { activePanel, isOptionsOpen, isLoading, display, performance } =
  storeToRefs(store);

const performanceMode = computed(() => {
  if (
    performance.value.reduceMotion &&
    performance.value.simplifyBackdrop &&
    performance.value.reduceTransparency
  ) {
    return "low-power";
  }
  if (
    performance.value.reduceMotion ||
    performance.value.simplifyBackdrop ||
    performance.value.reduceTransparency
  ) {
    return "custom";
  }
  return "standard";
});

const openSettings = () => {
  store.openSettingsPanel();
};

const closePanel = () => {
  store.closePanel();
};
</script>

<template>
  <div
    data-testid="app-shell"
    :data-performance-mode="performanceMode"
    class="relative min-h-screen overflow-hidden antialiased text-slate-900 dark:text-slate-100"
    :class="{
      'app-reduced-motion': performance.reduceMotion,
      'app-simplified-backdrop': performance.simplifyBackdrop,
      'app-reduced-transparency': performance.reduceTransparency,
    }"
  >
    <div
      v-if="display.showAmbient && !performance.simplifyBackdrop"
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

    <header class="sticky top-0 z-30 hidden px-4 pb-3 pt-4 sm:block">
      <div class="mx-auto w-full max-w-[88rem]">
        <div
          class="flex items-center justify-between gap-4 rounded-full border border-white/70 bg-white/58 px-4 py-3 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-950/58 sm:px-5"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold uppercase tracking-[0.35em] text-white shadow-sm dark:bg-white dark:text-slate-900"
            >
              R
            </div>
            <div>
              <p
                class="text-[0.58rem] uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400"
              >
                Commander studio
              </p>
              <h1 class="font-heading text-base text-slate-900 dark:text-white sm:text-lg">
                Randomander
              </h1>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="motion-press rounded-full border border-amber-200/80 bg-amber-100/82 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-amber-950 shadow-sm transition hover:bg-amber-200/82 dark:border-amber-300/40 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:bg-amber-300/20"
              @click="store.openOptions()"
            >
              Filters
            </button>
            <button
              type="button"
              class="motion-press rounded-full border border-white/75 bg-white/70 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-700 shadow-sm transition hover:bg-white dark:border-slate-700/60 dark:bg-slate-900/72 dark:text-slate-200 dark:hover:bg-slate-900"
              @click="openSettings"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="relative z-10">
      <main
        class="motion-fade-up mx-auto w-full max-w-[88rem] px-3 pb-44 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-4 sm:pb-20 sm:pt-4"
      >
        <div class="flex min-h-full flex-col gap-6">
          <DrawView />
        </div>
      </main>
    </div>

    <SupportPanel
      v-if="activePanel === 'settings'"
      label="Settings"
      @close="closePanel"
    >
      <SettingsView panel />
    </SupportPanel>
    <SupportPanel
      v-else-if="activePanel === 'history'"
      label="History"
      @close="closePanel"
    >
      <HistoryView panel />
    </SupportPanel>
    <SupportPanel
      v-else-if="activePanel === 'saved'"
      label="Saved pulls"
      @close="closePanel"
    >
      <SavedView panel />
    </SupportPanel>

    <OptionsModal v-if="isOptionsOpen" />
    <LoadingOverlay :is-loading="isLoading" />
  </div>
</template>
