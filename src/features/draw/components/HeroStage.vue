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
  showLinks: { type: Boolean, default: true },
  mode: { type: String as PropType<Mode>, required: true },
});

const edhrecLabel = computed(() =>
  props.mode === "partner" || props.heroCards.length === 2
    ? "EDHREC pair"
    : "EDHREC commander",
);

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
const revealKey = computed(
  () =>
    displayCards.value.map((card) => card.id).join("|") ||
    `${props.mode}-${props.stageTitle}`,
);

const placeholderLabel = computed(() => {
  if (props.mode === "partner") return "Pull partner cards";
  if (props.mode === "spark") return "Pull spark cards";
  return "Pull a commander";
});

const stageEyebrow = computed(() => {
  if (props.mode === "partner") return "Partner forge";
  if (props.mode === "spark") return "Spark spread";
  return "Command zone";
});

const stackClasses = computed(() => {
  if (layoutVariant.value === "dual") {
    return "mx-auto flex max-w-4xl flex-wrap items-end justify-center gap-4 lg:gap-3";
  }
  if (layoutVariant.value === "trio") {
    return "mx-auto flex max-w-5xl flex-wrap items-end justify-center gap-3 lg:gap-2";
  }
  return "mx-auto flex justify-center";
});

const getCardFrameClass = (index: number) => {
  if (layoutVariant.value === "single") {
    return "w-full max-w-[21rem] sm:max-w-[24rem] lg:max-w-[27rem]";
  }
  if (layoutVariant.value === "dual") {
    return index === 0
      ? "w-[12.25rem] sm:w-[14.75rem] lg:w-[16.6rem] lg:translate-x-3 lg:translate-y-4 lg:rotate-[-4deg]"
      : "w-[12.75rem] sm:w-[15.4rem] lg:w-[17.2rem] lg:-translate-x-3 lg:rotate-[4deg]";
  }
  if (index === 1) {
    return "relative z-10 w-[12.25rem] sm:w-[14.85rem] lg:w-[17rem]";
  }
  return index === 0
    ? "w-[9.5rem] sm:w-[11.5rem] lg:w-[13.1rem] lg:translate-x-2 lg:translate-y-6 lg:rotate-[-6deg]"
    : "w-[9.5rem] sm:w-[11.5rem] lg:w-[13.1rem] lg:-translate-x-2 lg:translate-y-6 lg:rotate-[6deg]";
};

const getCardShellClass = (index: number) => {
  if (layoutVariant.value === "single" || (layoutVariant.value === "trio" && index === 1)) {
    return "border-white/70 bg-white/95 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.6)] dark:border-slate-600/60 dark:bg-slate-900/94";
  }
  return "border-white/60 bg-white/86 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.45)] dark:border-slate-700/60 dark:bg-slate-900/86";
};
</script>

<template>
  <section
    class="relative px-2 py-2 text-slate-900 dark:text-white sm:px-4 sm:py-5"
  >
    <div
      class="pointer-events-none absolute left-1/2 top-10 h-44 w-44 -translate-x-1/2 rounded-full bg-amber-300/18 blur-3xl dark:bg-amber-300/10"
      aria-hidden="true"
    ></div>
    <div
      class="pointer-events-none absolute inset-x-0 bottom-8 mx-auto h-16 w-[72%] rounded-full bg-slate-900/12 blur-3xl dark:bg-slate-100/8"
      aria-hidden="true"
    ></div>

    <div class="relative z-10 text-center">
      <p
        class="text-[0.58rem] uppercase tracking-[0.42em] text-slate-500/90 dark:text-slate-400"
      >
        {{ stageEyebrow }}
      </p>

      <Transition name="hero-reveal" mode="out-in">
        <div :key="revealKey" class="mt-3 sm:mt-6" aria-live="polite">
          <div
            v-if="displayCards.length"
            :class="stackClasses"
            role="list"
            :aria-label="displayCards.length === 1 ? 'Commander card' : 'Commander cards'"
          >
            <article
              v-for="(card, index) in displayCards"
              :key="card.id"
              class="motion-card motion-card-hover relative"
              :class="getCardFrameClass(index)"
              role="listitem"
            >
              <div
                class="absolute inset-4 rounded-[2rem] bg-white/45 blur-3xl dark:bg-slate-700/20"
                aria-hidden="true"
              ></div>
              <div
                class="relative aspect-[63/88] overflow-hidden rounded-[1.9rem] border"
                :class="getCardShellClass(index)"
              >
                <img
                  :src="getCardImageUrl(card)"
                  :alt="card.name"
                  class="h-full w-full object-cover"
                />
                <div
                  class="hero-card-glint pointer-events-none absolute inset-y-0 left-[-35%] w-[38%] rotate-[14deg] bg-white/35"
                  aria-hidden="true"
                ></div>
              </div>
            </article>
          </div>
          <div v-else class="flex justify-center">
            <article
              class="motion-ghost flex h-[420px] w-full max-w-sm items-center justify-center rounded-[2rem] border border-dashed border-slate-300/80 bg-white/60 px-8 text-center text-[0.75rem] uppercase tracking-[0.3em] text-slate-500 dark:border-slate-600/70 dark:bg-slate-900/60 dark:text-slate-400"
            >
              {{ placeholderLabel }}
            </article>
          </div>
        </div>
      </Transition>

      <div class="mx-auto mt-4 max-w-2xl sm:mt-8">
        <h2 class="text-3xl font-semibold text-slate-900 dark:text-white sm:text-[3.15rem]">
          {{ heroCardName || stageTitle }}
        </h2>
        <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-[1rem]">
          {{ heroSubtitle }}
        </p>
        <div
          v-if="showLinks && (heroScryfallUrl || heroEdhrecUrl)"
          class="mt-4 flex flex-wrap justify-center gap-2 text-[0.62rem]"
        >
          <a
            v-if="heroScryfallUrl"
            :href="heroScryfallUrl"
            target="_blank"
            rel="noreferrer"
            class="motion-chip rounded-full border border-slate-200/80 bg-white/78 px-4 py-1.5 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900/78 dark:text-slate-300 dark:hover:border-slate-400"
          >
            Scryfall
          </a>
          <a
            v-if="heroEdhrecUrl"
            :href="heroEdhrecUrl"
            target="_blank"
            rel="noreferrer"
            class="motion-chip rounded-full border border-slate-200/80 bg-white/78 px-4 py-1.5 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900/78 dark:text-slate-300 dark:hover:border-slate-400"
          >
            {{ edhrecLabel }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
