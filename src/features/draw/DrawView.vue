<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import {
  ClockIcon,
  Cog6ToothIcon,
  FunnelIcon,
} from "@heroicons/vue/24/outline";
import { modes, type Mode, useRandomanderStore } from "../../stores/randomander";
import HeroStage from "./components/HeroStage.vue";
import { useHeroSummary } from "./composables/useHeroSummary";

const store = useRandomanderStore();
const { mode, isLoading, stageTitle, canRandomizePartner, partnerButtonLabel } =
  storeToRefs(store);

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

const heroTitle = computed(() =>
  heroGroup.value.length > 1
    ? heroGroup.value.map((card) => card.name).join(" + ")
    : heroCard.value?.name ?? stageTitle.value
);

const partnerNames = computed(() =>
  heroGroup.value.length > 1
    ? heroGroup.value.slice(1).map((card) => card.name).join(" / ")
    : ""
);

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
    <section class="mt-10 flex flex-col gap-6 px-4 md:px-8">
    <HeroStage
      :stage-title="stageTitle"
      :hero-card-name="heroTitle"
      :hero-subtitle="heroSubtitle"
      :hero-cards="heroCards"
    />

      <div class="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-[1.5rem] border border-slate-900/40 bg-slate-950/50 px-4 py-4 text-sm text-slate-200 dark:border-slate-700/50">
        <div class="flex justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.35em] text-slate-500">
              {{ heroGroup.length }} card{{ heroGroup.length === 1 ? "" : "s" }} in view
            </p>
            <p class="text-base font-semibold text-white">
              {{ heroTitle }}
            </p>
            <p
              v-if="partnerNames && heroGroup.length > 1"
              class="text-xs uppercase tracking-[0.2em] text-slate-400"
            >
              Partner: {{ partnerNames }}
            </p>
          </div>
          <div class="flex gap-2">
            <button
              v-if="canRandomizePartner"
              type="button"
              class="rounded-full border border-fuchsia-400 bg-fuchsia-600/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
              @click="handlePartner"
              :disabled="isLoading"
            >
              {{ partnerButtonLabel }}
            </button>
            <button
              v-if="heroHasCompanionSlot"
              type="button"
              class="rounded-full border border-cyan-400 bg-cyan-600/90 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white transition hover:bg-cyan-500 disabled:opacity-60"
              @click="handleHeroCompanion"
              :disabled="isLoading"
            >
              {{ heroCompanionButtonLabel }}
            </button>
          </div>
        </div>
      </div>

    <div class="mx-auto flex w-full max-w-4xl flex-col gap-4 border-t border-slate-900/40 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex w-full flex-col gap-2 sm:w-1/2">
        <label class="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
          Mode
        </label>
        <select
          :value="mode"
          class="w-full rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm text-white transition focus:border-fuchsia-400 focus:outline-none"
          @change="handleModeChange"
        >
          <option
            v-for="option in modes"
            :key="option.id"
            :value="option.id"
            class="bg-slate-950 text-white"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          class="flex items-center justify-center rounded-2xl bg-fuchsia-600 px-8 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
          :disabled="isLoading"
          @click="handleRandomize"
        >
          {{ isLoading ? "Shuffling…" : "Randomize" }}
        </button>

        <div class="flex gap-2">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-white transition hover:border-white/70"
            aria-label="Open history"
            @click="openHistory"
          >
            <ClockIcon class="h-5 w-5" stroke-width="1.7" />
          </button>

          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-white transition hover:border-white/70"
            aria-label="Open filters"
            @click="openFilters"
          >
            <FunnelIcon class="h-5 w-5" />
          </button>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/70 text-white transition hover:border-white/70"
            aria-label="Open settings"
            @click="openSettings"
          >
            <Cog6ToothIcon class="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
