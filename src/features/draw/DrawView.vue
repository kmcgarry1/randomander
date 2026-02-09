<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import {
  ClockIcon,
  Cog6ToothIcon,
  FunnelIcon,
} from "@heroicons/vue/24/outline";
import {
  modes,
  type Mode,
  useRandomanderStore,
} from "../../stores/randomander";
import HeroStage from "./components/HeroStage.vue";
import { useHeroSummary } from "./composables/useHeroSummary";
import { formatColorIdentity, getEdhrecCommanderUrl } from "../../lib/scryfall";

const store = useRandomanderStore();
const {
  mode,
  isLoading,
  options,
  stageTitle,
  canRandomizePartner,
  partnerButtonLabel,
} = storeToRefs(store);

const heroSummary = useHeroSummary();
const {
  heroCard,
  heroCards,
  heroSubtitle,
  heroPartnerKind,
  heroHasCompanionSlot,
  heroCompanionButtonLabel,
  heroGroup,
} = heroSummary;

const heroScryfallUrl = computed(() => heroCard.value?.scryfall_uri ?? "");
const heroEdhrecUrl = computed(() =>
  heroCard.value ? getEdhrecCommanderUrl(heroCard.value) : "",
);

const heroTitle = computed(() =>
  heroGroup.value.length > 1
    ? heroGroup.value.map((card) => card.name).join(" + ")
    : (heroCard.value?.name ?? stageTitle.value),
);

const partnerNames = computed(() =>
  heroGroup.value.length > 1
    ? heroGroup.value
        .slice(1)
        .map((card) => card.name)
        .join(" / ")
    : "",
);

const filterChips = computed(() => {
  const chips: string[] = [];
  if (options.value.selectedColors.length) {
    chips.push(formatColorIdentity(options.value.selectedColors));
  } else if (options.value.colorCount !== "any") {
    chips.push(`Colors ${options.value.colorCount}`);
  }
  if (options.value.colorCountMode === "exactly") {
    chips.push("Exact colors");
  }
  if (options.value.twoChoices && mode.value !== "spark") {
    chips.push("Two choices");
  }
  if (options.value.useRankCutoff) {
    chips.push("Skip top 10% EDHREC");
  }
  if (options.value.limitByDecks && !options.value.useRankCutoff) {
    chips.push(`Decks < ${options.value.maxDecks}`);
  }
  if (mode.value === "spark" && options.value.excludeGameChangers) {
    chips.push("No Game Changers");
  }
  return chips;
});

const updateMode = (value: Mode) => {
  mode.value = value;
};

const handleModeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) return;
  updateMode(target.value as Mode);
};

const handleRandomize = () => {
  store.randomize();
};

const handlePartner = () => {
  store.randomizePartnerForPrimary();
};

const handleHeroCompanion = () => {
  if (heroPartnerKind.value === "choose_background") {
    store.randomizeCommanderForBackground();
  } else {
    store.randomizePartnerForPrimary();
  }
};

const openFilters = () => {
  store.openOptions();
};

const openSettings = () => {
  store.view = "settings";
};

const openHistory = () => {
  store.view = "history";
};
</script>

<template>
  <section class="motion-fade-up mt-6 flex flex-col gap-6">
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <div class="flex flex-col gap-5">
        <HeroStage
          :stage-title="stageTitle"
          :hero-card-name="heroTitle"
          :hero-subtitle="heroSubtitle"
          :hero-cards="heroCards"
          :hero-scryfall-url="heroScryfallUrl"
          :hero-edhrec-url="heroEdhrecUrl"
          :mode="mode"
        />

        <div
          v-if="partnerNames || canRandomizePartner || heroHasCompanionSlot"
          class="rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <div
            class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
          >
            <div v-if="partnerNames">
              <p
                class="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400"
              >
                Partner
              </p>
              <p class="text-lg font-semibold text-slate-900 dark:text-white">
                {{ partnerNames }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-if="canRandomizePartner"
                type="button"
                class="motion-press rounded-full border border-slate-200 bg-slate-900 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-slate-800 disabled:opacity-60 dark:border-slate-700/60"
                @click="handlePartner"
                :disabled="isLoading"
              >
                {{ partnerButtonLabel }}
              </button>
              <button
                v-if="heroHasCompanionSlot"
                type="button"
                class="motion-press rounded-full border border-slate-200 bg-white px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="handleHeroCompanion"
                :disabled="isLoading"
              >
                {{ heroCompanionButtonLabel }}
              </button>
            </div>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 px-5 py-4 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 sm:flex-row sm:items-center sm:justify-between"
        >
          <button
            type="button"
            class="motion-press motion-pulse flex items-center justify-center rounded-full border border-amber-300 bg-amber-400 px-8 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
            :disabled="isLoading"
            @click="handleRandomize"
          >
            {{ isLoading ? "Shuffling…" : "Randomize" }}
          </button>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class="motion-press flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
              aria-label="Open history"
              @click="openHistory"
            >
              <ClockIcon class="h-5 w-5" stroke-width="1.7" />
            </button>

            <button
              type="button"
              class="motion-press flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
              aria-label="Options"
              @click="openFilters"
            >
              <FunnelIcon class="h-5 w-5" />
              <span class="sr-only">Options</span>
            </button>
            <button
              type="button"
              class="motion-press flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400"
              aria-label="Open settings"
              @click="openSettings"
            >
              <Cog6ToothIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <aside class="flex flex-col gap-4">
        <section
          class="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <p
            class="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
          >
            Mode
          </p>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Single commander, partner pair, or spark draw.
          </p>
          <select
            :value="mode"
            id="mode-select"
            class="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition focus:border-amber-400 focus:outline-none dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200"
            @change="handleModeChange"
          >
            <option
              v-for="option in modes"
              :key="option.id"
              :value="option.id"
              class="bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {{ option.label }}
            </option>
          </select>
        </section>

        <section
          class="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80"
        >
          <div class="flex items-center justify-between">
            <p
              class="text-[0.6rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
            >
              Filters
            </p>
            <button
              type="button"
              class="motion-press rounded-full border border-amber-200/80 bg-amber-100/70 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-amber-900 transition hover:bg-amber-200/80 dark:border-amber-300/40 dark:bg-amber-300/10 dark:text-amber-100 dark:hover:bg-amber-300/20"
              @click="openFilters"
            >
              Refine
            </button>
          </div>
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Adjust color constraints, deck limits, and choice mode.
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="chip in filterChips"
              :key="chip"
              class="motion-chip rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300"
            >
              {{ chip }}
            </span>
            <span
              v-if="filterChips.length === 0"
              class="motion-chip rounded-full border border-slate-200 bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-400"
            >
              No filters
            </span>
          </div>
        </section>
      </aside>
    </div>
  </section>
</template>
