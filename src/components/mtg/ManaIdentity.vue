<script setup lang="ts">
import { computed } from "vue";
import { formatColorIdentity } from "../../lib/scryfall";
import ScryfallSymbol from "./ScryfallSymbol.vue";

const props = withDefaults(
  defineProps<{
    colors: string[];
    compact?: boolean;
  }>(),
  {
    compact: false,
  },
);

const canonicalOrder = ["W", "U", "B", "R", "G"];

const symbols = computed(() => {
  const selected = new Set(props.colors.map((color) => color.toUpperCase()));
  const ordered = canonicalOrder.filter((color) => selected.has(color));
  return ordered.length ? ordered : ["C"];
});

const label = computed(() => formatColorIdentity(props.colors));
</script>

<template>
  <span
    class="mana-identity"
    :class="{ 'mana-identity--compact': compact }"
    role="img"
    :aria-label="`Color identity: ${label}`"
    :title="label"
  >
    <ScryfallSymbol
      v-for="symbol in symbols"
      :key="symbol"
      :symbol="symbol"
      decorative
    />
    <span v-if="!compact" class="mana-identity__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.mana-identity {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: inherit;
}

.mana-identity :deep(.scryfall-symbol) {
  width: 1.15rem;
  height: 1.15rem;
  filter: drop-shadow(0 1px 1px rgb(0 0 0 / 0.16));
}

.mana-identity--compact {
  gap: 0.18rem;
}

.mana-identity--compact :deep(.scryfall-symbol) {
  width: 1rem;
  height: 1rem;
}

.mana-identity__label {
  margin-inline-start: 0.2rem;
  font-size: 0.78rem;
  font-weight: 600;
}
</style>
