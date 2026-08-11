<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useModalFocus } from "../../composables/useModalFocus";

const props = defineProps<{ label: string }>();

const emit = defineEmits<{
  (event: "close"): void;
}>();

const close = () => emit("close");
const dialogRef = ref<HTMLElement | null>(null);

useModalFocus(dialogRef, close, {
  initialTarget: () => dialogRef.value,
  restoreTarget: () =>
    document.querySelector<HTMLElement>('[data-panel-invoker="true"]'),
});

watch(
  () => props.label,
  async () => {
    await nextTick();
    dialogRef.value?.focus({ preventScroll: true });
  },
);
</script>

<template>
  <div
    class="motion-overlay fixed inset-0 z-40 flex items-end justify-center bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_42%,transparent)] sm:items-stretch sm:justify-end"
    @click.self="close"
  >
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      tabindex="-1"
      class="motion-modal support-panel-motion h-[min(92dvh,52rem)] w-full overflow-y-auto overscroll-contain rounded-t-[var(--md-sys-shape-corner-extra-large)] bg-[var(--md-sys-color-surface-container-low)] px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-3 shadow-[var(--md-sys-elevation-3)] sm:h-full sm:max-w-[46rem] sm:rounded-none sm:border-l sm:border-[var(--md-sys-color-outline-variant)] sm:px-8 sm:pb-8 sm:pt-7"
    >
      <div
        class="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--md-sys-color-outline)] sm:hidden"
        aria-hidden="true"
      ></div>
      <slot />
    </div>
  </div>
</template>
