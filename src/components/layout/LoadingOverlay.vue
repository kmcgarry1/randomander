<script setup lang="ts">
import { ref } from "vue";
import { useModalFocus } from "../../composables/useModalFocus";

defineProps<{ isLoading: boolean }>();

const emit = defineEmits<{
  (event: "cancel"): void;
}>();

const dialogRef = ref<HTMLElement | null>(null);
const cancel = () => emit("cancel");

useModalFocus(dialogRef, cancel, {
  restoreTarget: () => document.getElementById("draw-randomize"),
});
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
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loading-title"
        aria-describedby="loading-description"
        tabindex="-1"
        class="motion-modal flex w-full max-w-sm flex-col items-center gap-5 rounded-[var(--md-sys-shape-corner-large)] bg-[var(--md-sys-color-surface-container-high)] px-8 py-7 text-center text-[var(--md-sys-color-on-surface)] shadow-[var(--md-sys-elevation-3)]"
      >
        <div
          class="motion-spin-slow h-12 w-12 rounded-[45%_55%_52%_48%] border-[5px] border-[var(--md-sys-color-primary-container)] border-t-[var(--md-sys-color-primary)]"
          aria-hidden="true"
        ></div>
        <div>
          <h2 id="loading-title" class="text-lg font-bold">Shuffling cards...</h2>
          <p
            id="loading-description"
            class="mt-2 text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)]"
          >
            Fetching a legal pull from Scryfall. Cancel to return to your previous
            result.
          </p>
        </div>
        <button
          type="button"
          class="m3-button m3-button--outlined"
          @click="cancel"
        >
          Cancel draw
        </button>
      </div>
    </div>
  </Transition>
</template>
