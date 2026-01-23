<script setup lang="ts">
import type { OptionsState, Mode, COLOR_CHOICES, colorOptions, modes } from "../../../stores/randomander";

const props = defineProps<{
  mode: Mode;
  modes: typeof modes;
  optionsState: OptionsState;
  colorCountModeOptions: { label: string; value: OptionsState["colorCountMode"] }[];
  colorCountOptions: typeof colorOptions;
  colorChoices: typeof COLOR_CHOICES;
  isColorlessActive: boolean;
  isColorSelected: (symbol: string) => boolean;
  toggleColorFilter: (symbol: string) => void;
  colorOptionLabel: (option: (typeof colorOptions)[number]) => string;
}>();

const emit = defineEmits<{ (event: "update:mode", value: Mode): void }>();

const onModeChange = (event: Event) => {
  const value = (event.target as HTMLSelectElement).value as Mode;
  emit("update:mode", value);
};

const onColorCountModeChange = (event: Event) => {
  props.optionsState.colorCountMode = (event.target as HTMLSelectElement)
    .value as OptionsState["colorCountMode"];
};

const onColorCountChange = (event: Event) => {
  props.optionsState.colorCount = (event.target as HTMLSelectElement)
    .value as OptionsState["colorCount"];
};
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-5xl flex-col gap-4 rounded-[2.5rem] border border-white/10 bg-white/5 px-6 py-8 text-[0.65rem] uppercase tracking-[0.3em] text-slate-200 shadow-[0_20px_60px_-40px_rgba(2,6,23,0.6)] backdrop-blur sm:flex-row sm:flex-wrap sm:items-end sm:justify-center"
  >
    <div class="flex w-full flex-col gap-2 sm:min-w-[10rem] sm:flex-1">
      <label class="text-[0.55rem] tracking-[0.4em] text-slate-400">Mode</label>
      <select
        :value="props.mode"
        class="w-full rounded-2xl border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white transition focus:border-fuchsia-400 focus:outline-none"
        @change="onModeChange"
      >
        <option
          v-for="option in props.modes"
          :key="option.id"
          :value="option.id"
          class="bg-slate-950 text-white"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="flex w-full flex-col gap-2 sm:min-w-[10rem] sm:flex-1">
      <label class="text-[0.55rem] tracking-[0.4em] text-slate-400">Comparison</label>
      <select
        :value="props.optionsState.colorCountMode"
        class="w-full rounded-2xl border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white transition focus:border-fuchsia-400 focus:outline-none"
        @change="onColorCountModeChange"
      >
        <option
          v-for="option in props.colorCountModeOptions"
          :key="option.value"
          :value="option.value"
          class="bg-slate-950 text-white"
        >
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="flex w-full flex-col gap-2 sm:min-w-[10rem] sm:flex-1">
      <label class="text-[0.55rem] tracking-[0.4em] text-slate-400">Count</label>
      <select
        :value="props.optionsState.colorCount"
        class="w-full rounded-2xl border border-white/20 bg-slate-950/50 px-3 py-2 text-sm text-white transition focus:border-fuchsia-400 focus:outline-none"
        @change="onColorCountChange"
      >
        <option
          v-for="option in props.colorCountOptions"
          :key="option.value"
          :value="option.value"
          class="bg-slate-950 text-white"
        >
          {{ props.colorOptionLabel(option) }}
        </option>
      </select>
    </div>

    <div class="flex w-full flex-col gap-2 sm:min-w-[14rem] sm:flex-1">
      <p class="text-[0.55rem] tracking-[0.3em] text-slate-400">Mana filters</p>
      <div class="flex flex-wrap gap-2 justify-center sm:justify-start">
        <button
          v-for="choice in props.colorChoices"
          :key="choice.symbol"
          type="button"
          class="flex min-w-[3.5rem] items-center justify-center gap-1 rounded-full border px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.16em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-400"
          :class="[
            choice.chip,
            props.isColorSelected(choice.symbol)
              ? 'ring-2 ring-offset-1 ring-white/70 dark:ring-0'
              : 'ring-0',
            props.isColorlessActive && choice.symbol !== 'C'
              ? 'cursor-not-allowed opacity-40'
              : '',
          ]"
          :aria-pressed="props.isColorSelected(choice.symbol)"
          :disabled="choice.symbol !== 'C' && props.isColorlessActive"
          @click="props.toggleColorFilter(choice.symbol)"
          :aria-label="choice.name"
        >
          <span class="text-2xl ms" aria-hidden="true" :class="choice.icon"></span>
          <span class="sr-only">{{ choice.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
