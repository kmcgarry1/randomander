<script setup lang="ts">
import { computed, type Component } from "vue";
import { storeToRefs } from "pinia";
import {
  AdjustmentsHorizontalIcon,
  BookmarkIcon,
  ClockIcon,
  Cog6ToothIcon,
  RectangleStackIcon,
} from "@heroicons/vue/24/outline";
import {
  BookmarkIcon as BookmarkIconSolid,
  ClockIcon as ClockIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
} from "@heroicons/vue/24/solid";
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
const { activePanel, isOptionsOpen, isLoading, performance } = storeToRefs(store);

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

const modalOpen = computed(
  () => Boolean(activePanel.value) || isOptionsOpen.value,
);

type Destination = "draw" | "history" | "saved" | "settings";

const destinations: Array<{
  id: Destination;
  label: string;
  icon: Component;
  activeIcon: Component;
}> = [
  {
    id: "draw",
    label: "Draw",
    icon: RectangleStackIcon,
    activeIcon: RectangleStackIconSolid,
  },
  { id: "history", label: "History", icon: ClockIcon, activeIcon: ClockIconSolid },
  { id: "saved", label: "Saved", icon: BookmarkIcon, activeIcon: BookmarkIconSolid },
  {
    id: "settings",
    label: "Settings",
    icon: Cog6ToothIcon,
    activeIcon: Cog6ToothIconSolid,
  },
];

const activeDestination = computed<Destination>(() => {
  if (
    activePanel.value === "history" ||
    activePanel.value === "saved" ||
    activePanel.value === "settings"
  ) {
    return activePanel.value;
  }
  return "draw";
});

const openDestination = (destination: Destination) => {
  if (destination === "draw") {
    store.closePanel();
    return;
  }
  if (destination === "history") store.openHistoryPanel();
  if (destination === "saved") store.openSavedPanel();
  if (destination === "settings") store.openSettingsPanel();
};

const closePanel = () => store.closePanel();
</script>

<template>
  <div
    data-testid="app-shell"
    :data-performance-mode="performanceMode"
    class="min-h-screen bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-on-surface)] antialiased"
    :class="{
      'app-reduced-motion': performance.reduceMotion,
      'app-simplified-backdrop': performance.simplifyBackdrop,
      'app-reduced-transparency': performance.reduceTransparency,
    }"
  >
    <div
      :inert="modalOpen ? true : undefined"
      :aria-hidden="modalOpen ? 'true' : undefined"
    >
    <header
      class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface)] px-4 sm:hidden"
    >
      <button
        type="button"
        class="flex items-center gap-3 rounded-xl text-left"
        aria-label="Go to draw"
        @click="openDestination('draw')"
      >
        <span
          class="grid h-9 w-9 place-items-center rounded-[0.8rem_0.8rem_0.8rem_0.3rem] bg-[var(--md-sys-color-primary)] text-sm font-extrabold text-[var(--md-sys-color-on-primary)]"
          aria-hidden="true"
        >R</span>
        <span class="block text-base font-bold leading-tight">Randomander</span>
      </button>
      <button
        type="button"
        class="m3-icon-button"
        aria-label="Filters"
        @click="store.openOptions()"
      >
        <AdjustmentsHorizontalIcon class="h-6 w-6" aria-hidden="true" />
      </button>
    </header>

    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col items-center border-r border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] px-2 py-5 sm:flex"
      aria-label="Primary navigation"
    >
      <button
        type="button"
        class="grid h-12 w-12 place-items-center rounded-[1.1rem_1.1rem_1.1rem_0.4rem] bg-[var(--md-sys-color-primary)] text-lg font-extrabold text-[var(--md-sys-color-on-primary)] shadow-[var(--md-sys-elevation-1)]"
        aria-label="Randomander draw"
        @click="openDestination('draw')"
      >
        R
      </button>

      <nav class="mt-10 flex w-full flex-1 flex-col items-center gap-2">
        <button
          v-for="destination in destinations"
          :key="destination.id"
          type="button"
          class="group flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.7rem] font-semibold transition-colors"
          :class="
            activeDestination === destination.id
              ? 'text-[var(--md-sys-color-on-primary-container)]'
              : 'text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)]'
          "
          :aria-current="activeDestination === destination.id ? 'page' : undefined"
          @click="openDestination(destination.id)"
        >
          <span
            class="grid h-8 w-14 place-items-center rounded-full transition-colors"
            :class="
              activeDestination === destination.id
                ? 'bg-[var(--md-sys-color-primary-container)]'
                : ''
            "
          >
            <component
              :is="
                activeDestination === destination.id
                  ? destination.activeIcon
                  : destination.icon
              "
              class="h-5 w-5"
              aria-hidden="true"
            />
          </span>
          {{ destination.label }}
        </button>
      </nav>
    </aside>

    <main class="min-h-screen pb-44 sm:ml-24 sm:pb-0">
      <DrawView />
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-30 grid h-[calc(5rem+env(safe-area-inset-bottom))] grid-cols-4 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container)] px-2 pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Primary navigation"
    >
      <button
        v-for="destination in destinations"
        :key="`mobile-${destination.id}`"
        type="button"
        class="flex flex-col items-center justify-center gap-1 rounded-2xl text-[0.7rem] font-semibold text-[var(--md-sys-color-on-surface-variant)]"
        :class="{
          'text-[var(--md-sys-color-on-primary-container)]':
            activeDestination === destination.id,
        }"
        :aria-current="activeDestination === destination.id ? 'page' : undefined"
        @click="openDestination(destination.id)"
      >
        <span
          class="grid h-8 w-14 place-items-center rounded-full"
          :class="{
            'bg-[var(--md-sys-color-primary-container)]':
              activeDestination === destination.id,
          }"
        >
          <component
            :is="
              activeDestination === destination.id
                ? destination.activeIcon
                : destination.icon
            "
            class="h-5 w-5"
            aria-hidden="true"
          />
        </span>
        {{ destination.label }}
      </button>
    </nav>
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
