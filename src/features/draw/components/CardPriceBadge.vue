<script setup lang="ts">
import { computed } from "vue";
import { ArrowTopRightOnSquareIcon } from "@heroicons/vue/24/outline";
import {
  getCardPrice,
  type PriceProvider,
  type ScryfallCard,
} from "../../../lib/scryfall";

const props = withDefaults(
  defineProps<{
    card: ScryfallCard;
    provider: PriceProvider;
    showLink?: boolean;
  }>(),
  {
    showLink: true,
  },
);

const price = computed(() => getCardPrice(props.card, props.provider));
const finishLabel = computed(() =>
  price.value?.finish === "regular" ? "" : price.value?.finish ?? "",
);
const accessibleLabel = computed(() => {
  if (!price.value) return "";
  const finish = finishLabel.value ? `, ${finishLabel.value}` : "";
  return `${price.value.providerLabel} price for ${props.card.name}: ${price.value.formatted}${finish}`;
});
const linkAccessibleLabel = computed(() =>
  accessibleLabel.value ? `${accessibleLabel.value}, opens in a new tab` : "",
);
</script>

<template>
  <a
    v-if="price?.purchaseUrl && showLink"
    :href="price.purchaseUrl"
    target="_blank"
    rel="noreferrer sponsored"
    class="motion-press inline-flex min-h-10 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0 rounded-full bg-[var(--md-sys-color-secondary-container)] px-2.5 py-1 text-xs font-semibold leading-4 text-[var(--md-sys-color-on-secondary-container)] no-underline"
    :aria-label="linkAccessibleLabel"
  >
    <span>{{ price.formatted }}</span>
    <span class="font-medium opacity-80">· {{ price.providerLabel }}</span>
    <span v-if="finishLabel" class="font-medium opacity-80">· {{ finishLabel }}</span>
    <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
  </a>
  <span
    v-else-if="price"
    class="inline-flex min-h-10 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0 rounded-full bg-[var(--md-sys-color-secondary-container)] px-2.5 py-1 text-xs font-semibold leading-4 text-[var(--md-sys-color-on-secondary-container)]"
  >
    <span class="sr-only">{{ accessibleLabel }}</span>
    <span aria-hidden="true">{{ price.formatted }}</span>
    <span aria-hidden="true" class="font-medium opacity-80">· {{ price.providerLabel }}</span>
    <span v-if="finishLabel" aria-hidden="true" class="font-medium opacity-80">· {{ finishLabel }}</span>
  </span>
</template>
