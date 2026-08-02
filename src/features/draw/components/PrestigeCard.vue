<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from "vue";
import { ArrowPathRoundedSquareIcon } from "@heroicons/vue/24/outline";
import type { ScryfallCard } from "../../../lib/scryfall";
import {
  getCardImageUrl,
  getTurnableCardFaces,
} from "../../../lib/scryfall";

const props = withDefaults(
  defineProps<{
    card: ScryfallCard;
    revealing?: boolean;
    concealed?: boolean;
    index?: number;
    total?: number;
    totalDurationMs?: number;
  }>(),
  {
    revealing: false,
    concealed: false,
    index: 0,
    total: 1,
    totalDurationMs: 2400,
  },
);

const timingStyle = computed<CSSProperties>(() => {
  const cardCount = Math.max(1, props.total);
  const staggerWindow =
    cardCount === 1 ? 0 : Math.min(620, 360 + (cardCount - 2) * 130);
  const cardDuration = props.totalDurationMs - staggerWindow;
  const delay =
    cardCount === 1 ? 0 : (staggerWindow / (cardCount - 1)) * props.index;

  return {
    "--reveal-duration": `${cardDuration}ms`,
    "--reveal-delay": `${Math.round(delay)}ms`,
  } as CSSProperties;
});

const selectedFaceIndex = ref(0);
const turnableFaces = computed(() => getTurnableCardFaces(props.card));
const isTurnable = computed(() => turnableFaces.value.length === 2);
const activeFace = computed(() =>
  isTurnable.value
    ? turnableFaces.value[selectedFaceIndex.value]
    : {
        index: 0,
        name: props.card.name,
        imageUrl: getCardImageUrl(props.card),
      },
);
const nextFaceIndex = computed(() =>
  isTurnable.value
    ? (selectedFaceIndex.value + 1) % turnableFaces.value.length
    : 0,
);
const nextFace = computed(() => turnableFaces.value[nextFaceIndex.value]);
const activeFacePosition = computed(() =>
  selectedFaceIndex.value === 0 ? "front" : "back",
);
const nextFacePosition = computed(() =>
  nextFaceIndex.value === 0 ? "front" : "back",
);
const activeImageAlt = computed(() =>
  isTurnable.value && activeFace.value
    ? `${activeFace.value.name} (${activeFacePosition.value} face)`
    : props.card.name,
);
const turnButtonLabel = computed(() =>
  nextFace.value
    ? `Show ${nextFace.value.name} (${nextFacePosition.value} face)`
    : "Turn card",
);
const showTurnControl = computed(
  () => isTurnable.value && !props.revealing && !props.concealed,
);

const showNextFace = () => {
  if (!showTurnControl.value) return;
  selectedFaceIndex.value = nextFaceIndex.value;
};

watch(
  () => props.card,
  () => {
    selectedFaceIndex.value = 0;
  },
);
watch(
  () => props.concealed,
  (concealed) => {
    if (concealed) selectedFaceIndex.value = 0;
  },
);
</script>

<template>
  <div
    class="prestige-card"
    :class="{
      'prestige-card--concealed': concealed,
      'prestige-card--revealing': revealing,
    }"
    :style="timingStyle"
    :data-reveal-index="index"
  >
    <div class="prestige-card__inner">
      <div class="prestige-card__face prestige-card__back" aria-hidden="true">
        <div class="prestige-card__back-frame">
          <span class="prestige-card__orbit prestige-card__orbit--outer"></span>
          <span class="prestige-card__orbit prestige-card__orbit--inner"></span>
          <span class="prestige-card__mark">R</span>
          <span class="prestige-card__back-name">Randomander</span>
        </div>
      </div>

      <div
        class="prestige-card__face prestige-card__front"
        :aria-hidden="revealing || concealed ? 'true' : undefined"
      >
        <img
          :src="activeFace?.imageUrl"
          :alt="revealing || concealed ? '' : activeImageAlt"
          class="prestige-card__image"
          decoding="async"
          :data-card-face="isTurnable ? activeFacePosition : undefined"
        />
        <img
          v-if="isTurnable && nextFace"
          :src="nextFace.imageUrl"
          alt=""
          class="hidden"
          aria-hidden="true"
          decoding="async"
        />
      </div>
    </div>
    <button
      v-if="showTurnControl"
      type="button"
      class="m3-button absolute inset-x-0 -bottom-4 z-10 mx-auto w-11 gap-0 bg-black/80 px-0 py-1.5 text-xs text-white shadow-[var(--md-sys-elevation-2)] backdrop-blur-sm sm:w-fit sm:gap-1.5 sm:px-3"
      :aria-label="turnButtonLabel"
      :title="turnButtonLabel"
      @click="showNextFace"
    >
      <ArrowPathRoundedSquareIcon class="h-4 w-4" aria-hidden="true" />
      <span class="hidden sm:inline">
        {{ nextFacePosition === "front" ? "Front face" : "Back face" }}
      </span>
    </button>
    <div class="prestige-card__flash" aria-hidden="true"></div>
  </div>
</template>
