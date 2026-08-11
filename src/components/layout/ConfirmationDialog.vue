<script setup lang="ts">
import { ref, useId } from "vue";
import { ExclamationTriangleIcon } from "@heroicons/vue/24/outline";
import { useModalFocus } from "../../composables/useModalFocus";

withDefaults(
  defineProps<{
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
  }>(),
  {
    danger: false,
  },
);

const emit = defineEmits<{
  (event: "cancel"): void;
  (event: "confirm"): void;
}>();

const titleId = useId();
const descriptionId = useId();
const dialogRef = ref<HTMLElement | null>(null);
const cancel = () => emit("cancel");

useModalFocus(dialogRef, cancel);
</script>

<template>
  <Teleport to="body">
    <div
      class="motion-overlay fixed inset-0 z-[80] grid place-items-center bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_48%,transparent)] px-4 py-6"
      @click.self="cancel"
    >
      <section
        ref="dialogRef"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="descriptionId"
        tabindex="-1"
        class="motion-modal w-full max-w-md rounded-[var(--md-sys-shape-corner-extra-large)] border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-low)] p-5 text-[var(--md-sys-color-on-surface)] shadow-[var(--md-sys-elevation-3)] sm:p-6"
      >
        <div class="flex items-start gap-4">
          <span
            class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]"
            aria-hidden="true"
          >
            <ExclamationTriangleIcon class="h-6 w-6" />
          </span>
          <div class="min-w-0">
            <h2 :id="titleId" class="text-xl font-bold leading-7">
              {{ title }}
            </h2>
            <p
              :id="descriptionId"
              class="mt-2 text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)]"
            >
              {{ description }}
            </p>
          </div>
        </div>

        <div class="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            class="m3-button m3-button--outlined"
            @click="cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            class="m3-button"
            :class="
              danger
                ? 'bg-[var(--md-sys-color-error-container)] text-[var(--md-sys-color-on-error-container)]'
                : 'm3-button--filled'
            "
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>
