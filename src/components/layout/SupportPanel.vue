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
    class="motion-overlay fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-stretch sm:justify-end"
    role="dialog"
    aria-modal="true"
    :aria-label="label"
    @click.self="handleBackdropClick"
  >
    <div
      class="motion-modal h-[88vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/80 bg-white/96 px-4 pb-8 pt-6 shadow-[0_18px_50px_-20px_rgba(15,23,42,0.5)] dark:border-slate-700/60 dark:bg-slate-950/96 sm:h-full sm:max-w-2xl sm:rounded-none sm:rounded-l-[2rem] sm:border-y-0 sm:border-r-0 sm:border-l sm:px-6"
    >
      <slot />
    </div>
  </div>
</template>
