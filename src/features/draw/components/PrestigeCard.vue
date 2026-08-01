<script setup lang="ts">
import { computed, type CSSProperties } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getCardImageUrl } from "../../../lib/scryfall";

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
          :src="getCardImageUrl(card)"
          :alt="revealing || concealed ? '' : card.name"
          class="prestige-card__image"
          decoding="async"
        />
      </div>
    </div>
    <div class="prestige-card__flash" aria-hidden="true"></div>
  </div>
</template>
