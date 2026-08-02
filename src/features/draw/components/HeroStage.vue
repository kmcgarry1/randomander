<script setup lang="ts">
import { computed, type PropType } from "vue";
import { ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/vue/24/outline";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getTypeLine, isBackgroundCard } from "../../../lib/scryfall";
import type { Mode } from "../../../stores/randomander";
import ManaIdentity from "../../../components/mtg/ManaIdentity.vue";
import PrestigeCard from "./PrestigeCard.vue";

const props = defineProps({
  heroCardName: { type: String, default: "" },
  heroCards: { type: Array as PropType<ScryfallCard[]>, required: true },
  heroScryfallUrl: { type: String, default: "" },
  heroEdhrecUrl: { type: String, default: "" },
  showLinks: { type: Boolean, default: true },
  mode: { type: String as PropType<Mode>, required: true },
  revealActive: { type: Boolean, default: false },
  revealComplete: { type: Boolean, default: false },
  revealDurationMs: { type: Number, default: 2400 },
});

const desiredCount = computed(() => {
  if (props.mode === "partner") return 2;
  if (props.mode === "spark") return 3;
  return Math.min(Math.max(props.heroCards.length, 1), 2);
});

const displayCards = computed(() => props.heroCards.slice(0, desiredCount.value));
const layoutVariant = computed(() => {
  if (desiredCount.value === 1) return "single";
  if (desiredCount.value === 2) return "dual";
  return "trio";
});

const eyebrow = computed(() => {
  if (props.mode === "partner") return "PARTNER PAIR";
  if (props.mode === "spark") return "THREE-CARD SPARK";
  return "COMMAND ZONE";
});

const placeholderTitle = computed(() => {
  if (props.mode === "partner") return "Find a partner pair";
  if (props.mode === "spark") return "Draw three cards";
  return "Draw a commander";
});

const listClasses = computed(() => {
  if (layoutVariant.value === "single") return "flex justify-center";
  if (layoutVariant.value === "dual") {
    return "flex flex-wrap items-end justify-center gap-3 sm:gap-5";
  }
  return "grid grid-cols-3 items-end justify-center gap-2 sm:gap-4";
});

const cardFrameClass = (index: number) => {
  if (layoutVariant.value === "single") {
    return "w-full max-w-[17rem] sm:max-w-[20rem]";
  }
  if (layoutVariant.value === "dual") {
    return index === 0
      ? "w-[9.6rem] sm:w-[14rem] lg:w-[15rem] sm:translate-y-3 sm:-rotate-2"
      : "w-[9.6rem] sm:w-[14rem] lg:w-[15rem] sm:rotate-2";
  }
  return index === 1
    ? "relative z-10 w-full max-w-[12rem] sm:max-w-[14rem]"
    : "w-full max-w-[10rem] translate-y-2 sm:max-w-[12rem] sm:translate-y-5";
};

const edhrecLabel = computed(() =>
  props.mode === "partner" || props.heroCards.length === 2
    ? "Open pair on EDHREC"
    : isBackgroundCard(props.heroCards[0])
      ? "Open Background on EDHREC"
      : "Open commander on EDHREC",
);

const edhrecLinkText = computed(() => {
  if (props.heroCards.length === 2) return "EDHREC pair";
  if (isBackgroundCard(props.heroCards[0])) return "EDHREC card";
  return "EDHREC commander";
});
</script>

<template>
  <div class="mx-auto max-w-4xl px-1 py-3 text-center sm:px-4 sm:py-5">
    <p class="m3-label">{{ eyebrow }}</p>

    <div v-if="displayCards.length" class="mt-4 sm:mt-6">
      <div
        :class="listClasses"
        role="list"
        :aria-label="displayCards.length === 1 ? 'Commander card' : 'Commander cards'"
      >
        <article
          v-for="(card, index) in displayCards"
          :key="card.id"
          :class="cardFrameClass(index)"
          role="listitem"
        >
          <PrestigeCard
            :card="card"
            :revealing="revealActive"
            :concealed="!revealComplete"
            :index="index"
            :total="displayCards.length"
            :total-duration-ms="revealDurationMs"
          />
        </article>
      </div>

      <div class="mx-auto mt-6 max-w-2xl sm:mt-8" aria-live="polite">
        <template v-if="revealComplete">
          <h2
            data-result-heading
            tabindex="-1"
            class="text-[clamp(1.9rem,5vw,3.25rem)] font-[760] leading-[1.02] tracking-[-0.035em]"
          >
            {{ heroCardName }}
          </h2>

          <div class="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <div
              v-for="card in displayCards"
              :key="`${card.id}-identity`"
              class="flex items-center gap-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
            >
              <ManaIdentity :colors="card.color_identity ?? []" compact />
              <span class="max-w-xs truncate">{{ getTypeLine(card) }}</span>
            </div>
          </div>

          <div v-if="showLinks" class="mt-5 flex flex-wrap justify-center gap-2">
            <a
              v-if="heroScryfallUrl"
              :href="heroScryfallUrl"
              target="_blank"
              rel="noreferrer"
              class="m3-button m3-button--text"
            >
              Scryfall
              <ArrowTopRightOnSquareIcon class="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              v-if="heroEdhrecUrl"
              :href="heroEdhrecUrl"
              target="_blank"
              rel="noreferrer"
              class="m3-button m3-button--text"
              :aria-label="edhrecLabel"
            >
              {{ edhrecLinkText }}
              <ArrowTopRightOnSquareIcon class="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </template>
        <template v-else>
          <p class="text-2xl font-bold">
            {{ revealActive ? "The cards are turning..." : "Preparing your pull..." }}
          </p>
        </template>
      </div>
    </div>

    <div v-else class="mx-auto mt-4 max-w-xl rounded-[var(--md-sys-shape-corner-extra-large)] bg-[var(--md-sys-color-surface-container)] px-6 py-10 sm:mt-6 sm:py-14">
      <span
        class="mx-auto grid h-20 w-16 place-items-center rounded-[1rem] border-2 border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-primary)] shadow-[var(--md-sys-elevation-1)]"
        aria-hidden="true"
      >
        <SparklesIcon class="h-8 w-8" />
      </span>
      <h2 class="mt-5 text-2xl font-bold">{{ placeholderTitle }}</h2>
    </div>
  </div>
</template>
