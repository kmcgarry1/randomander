<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRandomanderStore, type ThemeMode, type DisplaySettings } from '../../stores/randomander'

const store = useRandomanderStore()
const { display, theme, cacheSettings, history, saved } = storeToRefs(store)

type DisplayKey = keyof DisplaySettings

const themeOptions: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: 'system', label: 'System', description: 'Match your device theme.' },
  { value: 'light', label: 'Light', description: 'Always light mode.' },
  { value: 'dark', label: 'Dark', description: 'Always dark mode.' },
]

const displayToggles = computed(() => [
  { key: 'showHeader' as DisplayKey, label: 'Show header', description: 'Display the title and subtitle.' },
  { key: 'showStatus' as DisplayKey, label: 'Show status line', description: 'Display the current status.' },
  { key: 'showChips' as DisplayKey, label: 'Show summary chips', description: 'Display mode and color chips.' },
  { key: 'showCardTitles' as DisplayKey, label: 'Show card titles', description: 'Display card names below images.' },
  { key: 'showColorIdentity' as DisplayKey, label: 'Show color identity', description: 'Display color identity labels.' },
  { key: 'showLinks' as DisplayKey, label: 'Show links', description: 'Display Scryfall and EDHREC links.' },
  { key: 'showTags' as DisplayKey, label: 'Show EDHREC tags', description: 'Display commander tags (not for spark).' },
  { key: 'usePairTags' as DisplayKey, label: 'Use pair tags', description: 'Show tags for partner pairs as a whole.' },
  { key: 'showAmbient' as DisplayKey, label: 'Show ambient glow', description: 'Enable background glow.' },
])

const setTheme = (value: ThemeMode) => {
  theme.value = value
}

const clearCache = () => {
  store.clearNetworkCache()
}
</script>

<template>
  <section class="mt-6 space-y-6">
    <header>
      <p class="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
        Preferences
      </p>
      <h2 class="font-heading text-2xl text-slate-900 dark:text-white">Settings</h2>
    </header>

    <div class="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section
        class="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Theme
        </p>
        <div class="mt-4 grid gap-3">
          <button
            v-for="option in themeOptions"
            :key="option.value"
            type="button"
            class="flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left transition"
            :class="
              theme === option.value
                ? 'border-violet-500/60 bg-violet-500/10 text-violet-800 dark:text-violet-100'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            "
            @click="setTheme(option.value)"
          >
            <div>
              <p class="text-sm font-semibold">{{ option.label }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">{{ option.description }}</p>
            </div>
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs"
              :class="
                theme === option.value
                  ? 'border-violet-500/60 bg-violet-500 text-white'
                  : 'border-slate-200 text-slate-400 dark:border-slate-700/60 dark:text-slate-400'
              "
            >
              ✓
            </span>
          </button>
        </div>
      </section>

      <section
        class="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
      >
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Stats
        </p>
        <div class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <p>History entries: <span class="font-semibold text-slate-900 dark:text-white">{{ history.length }}</span></p>
          <p>Saved pulls: <span class="font-semibold text-slate-900 dark:text-white">{{ saved.length }}</span></p>
          <p class="text-xs text-slate-500 dark:text-slate-400">Stored locally on this device.</p>
        </div>
      </section>
    </div>

    <section
      class="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Display controls
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label
          v-for="item in displayToggles"
          :key="item.key"
          class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60"
        >
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">{{ item.label }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ item.description }}</p>
          </div>
          <input
            v-model="display[item.key]"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
        </label>
      </div>
    </section>

    <section
      class="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
    >
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Cache & performance
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <label class="flex items-start justify-between gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60">
          <div>
            <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Enable cache</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Reuse card details and EDHREC data.</p>
          </div>
          <input
            v-model="cacheSettings.enabled"
            type="checkbox"
            class="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
          />
        </label>

        <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Cache TTL (hours)</p>
          <input
            v-model.number="cacheSettings.ttlHours"
            type="number"
            min="1"
            step="1"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>

        <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Max cache entries</p>
          <input
            v-model.number="cacheSettings.maxEntries"
            type="number"
            min="20"
            step="10"
            class="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>

        <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-900/60">
          <p class="text-sm font-semibold text-slate-700 dark:text-slate-200">Clear cache</p>
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
