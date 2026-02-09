<script setup lang="ts">
import { computed } from "vue";
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getCardImageUrl } from "../../../lib/scryfall";
import type { Mode } from "../../../stores/randomander";

const props = defineProps({
  stageTitle: { type: String, required: true },
  heroCardName: { type: String, default: "" },
  heroSubtitle: { type: String, default: "" },
  heroCards: { type: Array as PropType<ScryfallCard[]>, required: true },
  heroScryfallUrl: { type: String, default: "" },
  heroEdhrecUrl: { type: String, default: "" },
  mode: { type: String as PropType<Mode>, required: true },
});

const desiredCount = computed(() => {
  if (props.mode === "partner") return 2;
  if (props.mode === "spark") return 3;
  const count = Math.max(props.heroCards.length, 1);
  return Math.min(count, 2);
});

const layoutVariant = computed(() => {
  if (desiredCount.value === 1) return "single";
  if (desiredCount.value === 2) return "dual";
  return "trio";
});

const displayCards = computed(() =>
  props.heroCards.slice(0, desiredCount.value),
);
const emptySlots = computed(() =>
  Math.max(desiredCount.value - displayCards.value.length, 0),
);

const placeholderLabel = computed(() => {
  if (props.mode === "partner") return "Pull partner cards";
  if (props.mode === "spark") return "Pull spark cards";
  return "Pull a commander";
});
</script>

<template>
  <div
    class="w-full rounded-[2.5rem] border border-slate-200/80 bg-white/80 px-5 py-6 text-slate-900 shadow-[0_30px_60px_-50px_rgba(15,23,42,0.25)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-white"
  >
    <div
      class="relative overflow-hidden rounded-[2rem] bg-slate-900/5 dark:bg-slate-950/40"
    >
      <div class="px-4 py-6" aria-live="polite">
        <div
          v-if="layoutVariant === 'single'"
          class="flex justify-center"
          role="list"
          aria-label="Commander card"
        >
          <article
            v-if="displayCards.length"
            class="motion-card motion-card-hover w-full max-w-sm sm:max-w-md lg:max-w-lg"
            role="listitem"
          >
            <div
              class="aspect-[63/88] w-full overflow-hidden rounded-[1.8rem] border border-slate-200/70 bg-white shadow-[0_25px_50px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:bg-slate-900"
            >
              <img
                :src="getCardImageUrl(displayCards[0])"
                :alt="displayCards[0]?.name ?? 'Commander card'"
                class="h-full w-full object-cover"
              />
            </div>
          </article>
          <article
            v-else
            class="motion-ghost flex h-[420px] w-full max-w-sm items-center justify-center rounded-[1.8rem] border border-dashed border-slate-300 bg-white/60 text-[0.75rem] uppercase tracking-[0.3em] text-slate-500 dark:border-slate-600/70 dark:bg-slate-900/60 dark:text-slate-400"
            role="listitem"
          >
            {{ placeholderLabel }}
          </article>
        </div>
        <div
          v-else
          class="grid gap-4"
          :class="
            layoutVariant === 'dual'
              ? 'sm:grid-cols-2'
              : 'sm:grid-cols-2 md:grid-cols-3'
          "
          role="list"
          aria-label="Commander cards"
        >
          <article
            v-for="card in displayCards"
            :key="card.id"
            class="motion-card motion-card-hover flex flex-col gap-2 rounded-[1.6rem] border border-slate-200/70 bg-white shadow-[0_15px_35px_-25px_rgba(15,23,42,0.2)] dark:border-slate-700/60 dark:bg-slate-900"
            role="listitem"
          >
            <div class="aspect-[63/88] w-full">
              <img
                :src="getCardImageUrl(card)"
                :alt="card.name"
                class="h-full w-full object-cover"
              />
            </div>
          </article>
          <article
            v-for="index in emptySlots"
            :key="`placeholder-${index}`"
            class="motion-ghost flex min-h-[320px] w-full items-center justify-center rounded-[1.6rem] border border-dashed border-slate-300 bg-white/60 text-[0.75rem] uppercase tracking-[0.3em] text-slate-500 dark:border-slate-600/70 dark:bg-slate-900/60 dark:text-slate-400"
            role="listitem"
          >
            {{ placeholderLabel }}
          </article>
        </div>
      </div>
    </div>
    <div class="mt-4 px-4">
      <p
        class="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400"
      >
        Commander studio
      </p>
      <h2 class="text-3xl font-semibold text-slate-900 dark:text-white">
        {{ heroCardName || stageTitle }}
      </h2>
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {{ heroSubtitle }}
      </p>
      <div
        v-if="heroScryfallUrl || heroEdhrecUrl"
        class="mt-3 flex flex-wrap gap-2 text-[0.65rem]"
      >
        <a
          v-if="heroScryfallUrl"
          :href="heroScryfallUrl"
          target="_blank"
          rel="noreferrer"
          class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
        >
          Scryfall
        </a>
        <a
          v-if="heroEdhrecUrl"
          :href="heroEdhrecUrl"
          target="_blank"
          rel="noreferrer"
          class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
        >
          EDHREC commander
        </a>
      </div>
    </div>
  </div>
</template>
