<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getCardArtUrl } from "../../../lib/scryfall";

const props = defineProps({
  cards: { type: Array as PropType<ScryfallCard[]>, required: true },
  simplified: { type: Boolean, default: false },
  ambient: { type: Boolean, default: false },
});

const featureArt = computed(() => {
  const card = props.cards.find((candidate) => getCardArtUrl(candidate));
  if (!card) return "";
  return getCardArtUrl(card);
});
</script>

<template>
  <div
    v-if="featureArt"
    data-testid="draw-backdrop"
    :data-mode="props.simplified ? 'simplified' : 'full'"
    class="pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large)]"
    aria-hidden="true"
  >
    <div
      class="absolute inset-[-8%] bg-cover bg-center transition-opacity duration-500"
      :class="
        props.simplified
          ? 'scale-105 opacity-[0.10]'
          : props.ambient
            ? 'scale-110 opacity-[0.26] blur-3xl saturate-125'
            : 'scale-110 opacity-[0.15] blur-3xl saturate-110'
      "
      :style="{ backgroundImage: `url(${featureArt})` }"
    ></div>
    <div
      class="absolute inset-0 bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-lowest)_78%,transparent)]"
    ></div>
  </div>
</template>
