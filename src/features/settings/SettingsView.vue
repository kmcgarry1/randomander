<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  CircleStackIcon,
  ClockIcon,
  ComputerDesktopIcon,
  EyeIcon,
  MoonIcon,
  PaintBrushIcon,
  SparklesIcon,
  SunIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import {
  useRandomanderStore,
  type ThemeMode,
} from "../../stores/randomander";

const props = withDefaults(
  defineProps<{
    panel?: boolean;
  }>(),
  {
    panel: false,
  },
);

const store = useRandomanderStore();
const { display, theme, cacheSettings, history, performance } =
  storeToRefs(store);

const themeOptions: Array<{
  value: ThemeMode;
  label: string;
  description: string;
  icon: typeof ComputerDesktopIcon;
}> = [
  {
    value: "system",
    label: "System",
    description: "Match your device theme.",
    icon: ComputerDesktopIcon,
  },
  {
    value: "light",
    label: "Light",
    description: "Always light mode.",
    icon: SunIcon,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always dark mode.",
    icon: MoonIcon,
  },
];

const activeThemeDescription = computed(
  () =>
    themeOptions.find((option) => option.value === theme.value)?.description ??
    "Match your device theme.",
);

const displayToggles = computed(() => [
  {
    key: "enablePrestigeReveal" as const,
    label: "Prestige reveal animation",
    description:
      "Turn this off to skip future card-back reveals until you re-enable it here.",
  },
  {
    key: "showLinks" as const,
    label: "External links",
    description: "Show Scryfall and EDHREC links around active results.",
  },
  {
    key: "showTags" as const,
    label: "EDHREC metadata",
    description: "Show deck counts and tag chips on active results.",
  },
  {
    key: "showAmbient" as const,
    label: "Card-art atmosphere",
    description: "Strengthen the revealed card art tint behind the result stage.",
  },
]);

const performancePreset = computed(() => {
  if (
    performance.value.reduceMotion &&
    performance.value.simplifyBackdrop &&
    performance.value.reduceTransparency
  ) {
    return "low-power";
  }
  if (
    !performance.value.reduceMotion &&
    !performance.value.simplifyBackdrop &&
    !performance.value.reduceTransparency
  ) {
    return "standard";
  }
  return "custom";
});

const performanceProfiles = [
  {
    value: "standard" as const,
    label: "Standard",
    description: "Keep the full motion, artwork, and surface treatments.",
  },
  {
    value: "low-power" as const,
    label: "Low power",
    description: "Cut motion and simplify heavier visual effects.",
  },
];

const activePerformanceDescription = computed(() => {
  if (performancePreset.value === "custom") {
    return "Choose individual controls below for a custom setup.";
  }
  return (
    performanceProfiles.find(
      (profile) => profile.value === performancePreset.value,
    )?.description ?? "Keep the full motion, artwork, and surface treatments."
  );
});

const performanceToggles = computed(() => [
  {
    key: "reduceMotion" as const,
    label: "Reduce motion",
    description: "Turn off most animations and reveal effects.",
  },
  {
    key: "simplifyBackdrop" as const,
    label: "Simplify backdrop",
    description: "Use a flatter, lower-cost card-art treatment behind results.",
  },
  {
    key: "reduceTransparency" as const,
    label: "Reduce transparency",
    description: "Disable expensive blur and translucent surface effects.",
  },
]);

const setTheme = (value: ThemeMode) => {
  theme.value = value;
};

const setPerformancePreset = (value: "standard" | "low-power") => {
  store.applyPerformancePreset(value);
};

const clearCache = () => {
  store.clearNetworkCache();
};

const openHistory = () => {
  store.openHistoryPanel();
};

const closeSettings = () => {
  store.closePanel();
};
</script>

<template>
  <section
    :class="[
      'mx-auto max-w-4xl space-y-6 pb-4 sm:space-y-8',
      props.panel ? '' : 'mt-6',
    ]"
  >
    <header class="flex items-start gap-3 px-1 sm:items-center sm:gap-4">
      <div
        class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[1rem_1rem_1rem_0.4rem] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] sm:flex"
        aria-hidden="true"
      >
        <PaintBrushIcon class="h-6 w-6" />
      </div>

      <div class="min-w-0 flex-1">
        <h2
          class="text-[1.75rem] font-medium leading-tight text-[var(--md-sys-color-on-surface)] sm:text-3xl"
        >
          Settings
        </h2>
        <p
          class="mt-1 max-w-2xl text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
        >
          Tune how Randomander looks, reveals cards, and stores network data on
          this device.
        </p>
      </div>

      <button
        type="button"
        class="m3-button m3-button--text shrink-0"
        @click="closeSettings"
      >
        <XMarkIcon v-if="props.panel" class="h-5 w-5" aria-hidden="true" />
        <CheckIcon v-else class="h-5 w-5" aria-hidden="true" />
        {{ props.panel ? "Close" : "Done" }}
      </button>
    </header>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section
        class="m3-card p-4 sm:p-6 lg:col-span-2"
        aria-labelledby="settings-theme-title"
      >
        <div class="flex items-start gap-3">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem_1rem_1rem_0.35rem] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
            aria-hidden="true"
          >
            <PaintBrushIcon class="h-5 w-5" />
          </div>
          <div>
            <h3
              id="settings-theme-title"
              class="text-lg font-semibold text-[var(--md-sys-color-on-surface)]"
            >
              Theme
            </h3>
            <p
              class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
            >
              Choose a comfortable color appearance for this device.
            </p>
          </div>
        </div>

        <div class="m3-segmented mt-5" aria-label="Theme">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="m3-segmented__button flex items-center justify-center gap-2 px-2"
            :aria-pressed="theme === option.value"
            @click="setTheme(option.value)"
          >
            <component :is="option.icon" class="h-4 w-4" aria-hidden="true" />
            <span>{{ option.label }}</span>
          </button>
        </div>
        <p
          class="mt-3 text-sm text-[var(--md-sys-color-on-surface-variant)]"
          aria-live="polite"
        >
          {{ activeThemeDescription }}
        </p>
      </section>

      <section
        class="m3-card overflow-hidden"
        aria-labelledby="settings-display-title"
      >
        <div class="flex items-start gap-3 p-4 pb-3 sm:p-6 sm:pb-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem_1rem_1rem_0.35rem] bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]"
            aria-hidden="true"
          >
            <EyeIcon class="h-5 w-5" />
          </div>
          <div>
            <h3
              id="settings-display-title"
              class="text-lg font-semibold text-[var(--md-sys-color-on-surface)]"
            >
              Display controls
            </h3>
            <p
              class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
            >
              Decide what appears with each result.
            </p>
          </div>
        </div>

        <div class="px-4 pb-2 sm:px-6 sm:pb-3">
          <label
            v-for="item in displayToggles"
            :key="item.key"
            :class="[
              'flex min-h-20 cursor-pointer items-center gap-4 border-t border-[var(--md-sys-color-outline-variant)] py-4',
              item.key === 'enablePrestigeReveal'
                ? 'rounded-2xl border-0 bg-[var(--md-sys-color-tertiary-container)] px-4 text-[var(--md-sys-color-on-tertiary-container)]'
                : '',
            ]"
          >
            <SparklesIcon
              v-if="item.key === 'enablePrestigeReveal'"
              class="h-6 w-6 shrink-0"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold">{{ item.label }}</span>
              <span
                :id="`display-${item.key}-description`"
                class="mt-1 block text-sm leading-5 opacity-80"
              >
                {{ item.description }}
              </span>
            </span>
            <input
              v-model="display[item.key]"
              type="checkbox"
              class="m3-switch"
              :aria-describedby="`display-${item.key}-description`"
            />
          </label>
        </div>
      </section>

      <section
        class="m3-card overflow-hidden"
        aria-labelledby="settings-performance-title"
      >
        <div class="flex items-start gap-3 p-4 pb-3 sm:p-6 sm:pb-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem_1rem_1rem_0.35rem] bg-[var(--md-sys-color-tertiary-container)] text-[var(--md-sys-color-on-tertiary-container)]"
            aria-hidden="true"
          >
            <BoltIcon class="h-5 w-5" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3
                id="settings-performance-title"
                class="text-lg font-semibold text-[var(--md-sys-color-on-surface)]"
              >
                Performance
              </h3>
              <span class="m3-chip">
                {{
                  performancePreset === "custom"
                    ? "Custom"
                    : performancePreset === "low-power"
                      ? "Low power"
                      : "Standard"
                }}
              </span>
            </div>
            <p
              class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
            >
              Balance expressive motion with battery and device needs.
            </p>
          </div>
        </div>

        <div class="px-4 pb-4 sm:px-6">
          <div class="m3-segmented" aria-label="Performance profile">
            <button
              v-for="option in performanceProfiles"
              :key="option.value"
              type="button"
              class="m3-segmented__button px-3"
              :aria-pressed="performancePreset === option.value"
              @click="setPerformancePreset(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
          <p
            class="mt-3 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
          >
            {{ activePerformanceDescription }}
          </p>

          <div class="mt-4">
            <label
              v-for="item in performanceToggles"
              :key="item.key"
              class="flex min-h-20 cursor-pointer items-center gap-4 border-t border-[var(--md-sys-color-outline-variant)] py-4"
            >
              <span class="min-w-0 flex-1">
                <span
                  class="block text-sm font-semibold text-[var(--md-sys-color-on-surface)]"
                >
                  {{ item.label }}
                </span>
                <span
                  :id="`performance-${item.key}-description`"
                  class="mt-1 block text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
                >
                  {{ item.description }}
                </span>
              </span>
              <input
                v-model="performance[item.key]"
                type="checkbox"
                class="m3-switch"
                :aria-describedby="`performance-${item.key}-description`"
              />
            </label>
          </div>
        </div>
      </section>

      <section
        class="m3-card overflow-hidden lg:col-span-2"
        aria-labelledby="settings-cache-title"
      >
        <div class="flex items-start gap-3 p-4 pb-3 sm:p-6 sm:pb-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem_1rem_1rem_0.35rem] bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]"
            aria-hidden="true"
          >
            <CircleStackIcon class="h-5 w-5" />
          </div>
          <div>
            <h3
              id="settings-cache-title"
              class="text-lg font-semibold text-[var(--md-sys-color-on-surface)]"
            >
              Cache
            </h3>
            <p
              class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
            >
              Reuse Scryfall and EDHREC responses to make repeat visits faster.
            </p>
          </div>
        </div>

        <div class="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-6 sm:pb-6 lg:grid-cols-3">
          <label
            class="flex min-h-20 cursor-pointer items-center gap-4 rounded-[var(--md-sys-shape-corner-medium)] bg-[var(--md-sys-color-surface-container)] p-4"
          >
            <span class="min-w-0 flex-1">
              <span
                class="block text-sm font-semibold text-[var(--md-sys-color-on-surface)]"
              >
                Enable cache
              </span>
              <span
                id="cache-enabled-description"
                class="mt-1 block text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
              >
                Reuse card details and EDHREC data.
              </span>
            </span>
            <input
              v-model="cacheSettings.enabled"
              type="checkbox"
              class="m3-switch"
              aria-describedby="cache-enabled-description"
            />
          </label>

          <label for="cache-ttl" class="block">
            <span
              class="mb-2 block text-sm font-semibold text-[var(--md-sys-color-on-surface)]"
            >
              Cache TTL (hours)
            </span>
            <input
              id="cache-ttl"
              v-model.number="cacheSettings.ttlHours"
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              class="m3-field"
            />
          </label>

          <label for="cache-max-entries" class="block">
            <span
              class="mb-2 block text-sm font-semibold text-[var(--md-sys-color-on-surface)]"
            >
              Max cache entries
            </span>
            <input
              id="cache-max-entries"
              v-model.number="cacheSettings.maxEntries"
              type="number"
              min="20"
              step="10"
              inputmode="numeric"
              class="m3-field"
            />
          </label>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <div>
            <p class="text-sm font-semibold text-[var(--md-sys-color-on-surface)]">
              Clear cache
            </p>
            <p
              class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
            >
              Remove cached responses stored locally. Your settings stay intact.
            </p>
          </div>
          <button
            type="button"
            class="m3-button m3-button--danger shrink-0"
            @click="clearCache"
          >
            <TrashIcon class="h-5 w-5" aria-hidden="true" />
            Clear cache
          </button>
        </div>
      </section>

      <section
        class="m3-card m3-card--filled flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:p-6 lg:col-span-2"
        aria-labelledby="settings-history-title"
      >
        <div
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem_1.1rem_1.1rem_0.4rem] bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]"
          aria-hidden="true"
        >
          <ClockIcon class="h-6 w-6" />
        </div>
        <div class="min-w-0 flex-1">
          <h3
            id="settings-history-title"
            class="text-lg font-semibold text-[var(--md-sys-color-on-surface)]"
          >
            History
          </h3>
          <p
            class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]"
          >
            History entries:
            <strong class="font-semibold text-[var(--md-sys-color-on-surface)]">
              {{ history.length }}
            </strong>
            · Stored locally on this device.
          </p>
        </div>
        <button
          type="button"
          class="m3-button m3-button--tonal w-full shrink-0 sm:w-auto"
          @click="openHistory"
        >
          Open history
          <ArrowRightIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </section>
    </div>
  </section>
</template>
