<script setup lang="ts">
defineProps<{ isLoading: boolean }>();
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    leave-active-class="transition-opacity duration-150 ease-in"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isLoading"
      class="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_36%,transparent)] px-4"
      role="status"
      aria-live="polite"
      aria-label="Loading cards"
    >
      <div
        class="motion-modal flex min-w-56 flex-col items-center gap-5 rounded-[var(--md-sys-shape-corner-large)] bg-[var(--md-sys-color-surface-container-high)] px-8 py-7 text-center text-[var(--md-sys-color-on-surface)] shadow-[var(--md-sys-elevation-3)]"
      >
        <div
          class="motion-spin-slow h-12 w-12 rounded-[45%_55%_52%_48%] border-[5px] border-[var(--md-sys-color-primary-container)] border-t-[var(--md-sys-color-primary)]"
          aria-hidden="true"
        ></div>
        <p class="text-base font-bold">Shuffling cards...</p>
      </div>
    </div>
  </Transition>
</template>
