<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    symbol: string;
    label?: string;
    decorative?: boolean;
  }>(),
  {
    label: "",
    decorative: false,
  },
);

const normalizedSymbol = computed(() =>
  props.symbol.trim().replace(/^\{/, "").replace(/\}$/, "").toUpperCase(),
);

const fileName = computed(() => {
  if (normalizedSymbol.value === "½") return "HALF";
  return normalizedSymbol.value.replace(/\//g, "");
});

const source = computed(
  () => `https://svgs.scryfall.io/card-symbols/${encodeURIComponent(fileName.value)}.svg`,
);

const accessibleLabel = computed(
  () => props.label || `${normalizedSymbol.value} Magic symbol`,
);
</script>

<template>
  <img
    class="scryfall-symbol"
    :src="source"
    :alt="decorative ? '' : accessibleLabel"
    :aria-hidden="decorative ? 'true' : undefined"
    loading="lazy"
    decoding="async"
  />
</template>

<style scoped>
.scryfall-symbol {
  display: block;
  width: 1em;
  height: 1em;
  flex: 0 0 auto;
  object-fit: contain;
}
</style>
