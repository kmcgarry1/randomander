<script setup lang="ts">
defineProps<{
  label: string;
}>();

const emit = defineEmits<{
  (event: "close"): void;
}>();

const handleBackdropClick = () => {
  emit("close");
};
</script>

<template>
  <div
    class="motion-overlay fixed inset-0 z-40 flex items-end justify-center bg-slate-900/28 backdrop-blur-sm sm:items-stretch sm:justify-end"
    role="dialog"
    aria-modal="true"
    :aria-label="label"
    @click.self="handleBackdropClick"
  >
    <div
      class="motion-modal h-[min(92dvh,48rem)] w-full overflow-y-auto overscroll-contain rounded-t-[1.75rem] border border-white/80 bg-[rgba(248,248,250,0.96)] px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-4 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:bg-slate-950/96 sm:h-full sm:max-w-2xl sm:rounded-none sm:rounded-l-[2rem] sm:border-y-0 sm:border-r-0 sm:border-l sm:px-6 sm:pb-8 sm:pt-6"
    >
      <div
        class="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden"
        aria-hidden="true"
      ></div>
      <slot />
    </div>
  </div>
</template>
