<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
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
}> = [
  { value: "system", label: "System", description: "Match your device theme." },
  { value: "light", label: "Light", description: "Always light mode." },
  { value: "dark", label: "Dark", description: "Always dark mode." },
];

const displayToggles = computed(() => [
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
    label: "Ambient glow",
    description: "Enable the background glow treatment behind the app shell.",
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
    description: "Keep the full reveal effects and glass treatment.",
  },
  {
    value: "low-power" as const,
    label: "Low power",
    description: "Cut motion, simplify the backdrop, and reduce blur.",
  },
];

const performanceToggles = computed(() => [
  {
    key: "reduceMotion" as const,
    label: "Reduce motion",
    description: "Turn off most animations and reveal effects.",
  },
  {
    key: "simplifyBackdrop" as const,
    label: "Simplify backdrop",
    description: "Use a single static card-art wash instead of layered animated art.",
  },
  {
    key: "reduceTransparency" as const,
    label: "Reduce blur and glass",
    description: "Disable expensive backdrop blur on panels and overlays.",
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
      'motion-fade-up mx-auto max-w-3xl space-y-5',
      props.panel ? '' : 'mt-6',
    ]"
  >
    <header
      class="flex flex-col gap-3 px-2 py-1 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p
          class="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400"
        >
          Preferences
        </p>
        <h2 class="font-heading text-2xl text-slate-900 dark:text-white">
          Settings
        </h2>
      </div>
      <button
        type="button"
        class="motion-press rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        @click="closeSettings"
      >
        {{ props.panel ? "Close" : "Done" }}
      </button>
    </header>

    <div class="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
      <section
        class="rounded-[2rem] border border-white/80 bg-white/76 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/76"
      >
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
        >
          Theme
        </p>
        <div class="mt-4 grid gap-3">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="motion-press flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition"
            :class="
              theme === option.value
                ? 'border-amber-400/70 bg-amber-200/40 text-amber-900 dark:text-amber-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            "
            @click="setTheme(option.value)"
          >
            <div>
              <p class="text-sm font-semibold">{{ option.label }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ option.description }}
              </p>
            </div>
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs"
              :class="
                theme === option.value
                  ? 'border-amber-400/70 bg-amber-400 text-slate-900'
                  : 'border-slate-200 text-slate-400 dark:border-slate-700/60 dark:text-slate-400'
              "
            >
              ✓
            </span>
          </button>
        </div>
      </section>

      <section
        class="rounded-[2rem] border border-white/80 bg-white/76 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/76"
      >
        <p
          class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
        >
          History
        </p>
        <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>
            History entries:
            <span class="font-semibold text-slate-900 dark:text-white">{{
              history.length
            }}</span>
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Stored locally on this device.
          </p>
          <button
            type="button"
            class="motion-press inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            @click="openHistory"
          >
            Open history
          </button>
        </div>
      </section>
    </div>

    <section
      class="rounded-[2rem] border border-white/80 bg-white/76 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/76"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
          >
            Display controls
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Only active controls are shown here until the richer result metadata
            surfaces return.
          </p>
        </div>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label
          v-for="item in displayToggles"
          :key="item.key"
          class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ item.label }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ item.description }}
            </p>
          </div>
          <input
            v-model="display[item.key]"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
        </label>
      </div>
    </section>

    <section
      class="rounded-[2rem] border border-white/80 bg-white/76 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/76"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
          >
            Performance
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Trim the heavier visual effects for older laptops and lower-power devices.
          </p>
        </div>
        <span
          class="rounded-full border border-slate-200/70 bg-slate-50/80 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
        >
          {{
            performancePreset === "custom"
              ? "Custom"
              : performancePreset === "low-power"
                ? "Low power"
                : "Standard"
          }}
        </span>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          v-for="option in performanceProfiles"
          :key="option.value"
          type="button"
          class="motion-press rounded-2xl border px-4 py-4 text-left transition"
          :class="
            performancePreset === option.value
              ? 'border-amber-400/70 bg-amber-200/40 text-amber-900 dark:text-amber-100'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
          "
          @click="setPerformancePreset(option.value)"
        >
          <p class="text-sm font-semibold">{{ option.label }}</p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ option.description }}
          </p>
        </button>
      </div>

      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label
          v-for="item in performanceToggles"
          :key="item.key"
          class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {{ item.label }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ item.description }}
            </p>
          </div>
          <input
            v-model="performance[item.key]"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
        </label>
      </div>
    </section>

    <section
      class="rounded-[2rem] border border-white/80 bg-white/76 p-5 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.22)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/76"
    >
      <p
        class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
      >
        Cache
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label
          class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Enable cache
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Reuse card details and EDHREC data.
            </p>
          </div>
          <input
            v-model="cacheSettings.enabled"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
        </label>

        <div
          class="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Cache TTL (hours)
          </p>
          <input
            v-model.number="cacheSettings.ttlHours"
            type="number"
            min="1"
            step="1"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-amber-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>

        <div
          class="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Max cache entries
          </p>
          <input
            v-model.number="cacheSettings.maxEntries"
            type="number"
            min="20"
            step="10"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-amber-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>

        <div
          class="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Clear cache
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            Remove cached responses stored locally.
          </p>
          <button
            type="button"
            class="mt-3 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:bg-rose-500/20"
            @click="clearCache"
          >
            Clear cache
          </button>
        </div>
      </div>
    </section>
  </section>
</template>
