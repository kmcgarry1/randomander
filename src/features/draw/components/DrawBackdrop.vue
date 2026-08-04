<script setup lang="ts">
const props = defineProps({
  simplified: { type: Boolean, default: false },
  ambient: { type: Boolean, default: false },
});
</script>

<template>
  <div
    v-if="ambient"
    data-testid="draw-backdrop"
    :data-mode="props.simplified ? 'simplified' : 'full'"
    class="pointer-events-none absolute inset-0 overflow-hidden rounded-[var(--md-sys-shape-corner-extra-large)]"
    aria-hidden="true"
  >
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,var(--md-sys-color-primary-container),transparent_42%),radial-gradient(circle_at_82%_72%,var(--md-sys-color-tertiary-container),transparent_45%),linear-gradient(145deg,var(--md-sys-color-surface-container-lowest),var(--md-sys-color-surface-container))] transition-opacity duration-500"
      :class="props.simplified ? 'opacity-35' : 'opacity-70'"
    ></div>
    <div
      class="absolute inset-0 bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-lowest)_62%,transparent)]"
    ></div>
  </div>
</template>
