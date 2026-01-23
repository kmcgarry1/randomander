<script setup lang="ts">
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getCardImageUrl } from "../../../lib/scryfall";

const props = defineProps({
  stageTitle: { type: String, required: true },
  heroCardName: { type: String, default: null },
  heroSubtitle: { type: String, default: "" },
  heroCards: { type: Array as PropType<ScryfallCard[]>, required: true },
  isLoading: { type: Boolean, required: true },
});

const emit = defineEmits<{ (event: "randomize"): void }>();
const handleRandomize = () => emit("randomize");
</script>

<template>
  <div
    class="mx-auto flex max-w-md flex-col items-center gap-8 rounded-[3rem] border border-slate-900/60 bg-gradient-to-b from-slate-950/80 to-slate-900/50 p-8 text-center text-slate-100 shadow-[0_35px_60px_-45px_rgba(2,4,16,0.85)] backdrop-blur"
  >
    <p class="text-[0.65rem] uppercase tracking-[0.4em] text-slate-500">
      Commander studio
    </p>
    <h1 class="text-4xl font-semibold tracking-[0.16em] text-white uppercase">
      {{ stageTitle }}
    </h1>
    <div
      class="relative flex h-[320px] w-full max-w-[23rem] flex-col items-center justify-center overflow-hidden rounded-[2.5rem] border border-dashed border-slate-700/70 bg-slate-950/90 shadow-[0_25px_60px_-36px_rgba(10,12,20,0.95)]"
    >
      <div
        class="absolute inset-0 rounded-[2.5rem] border border-slate-800/40 bg-gradient-to-b from-transparent via-slate-950/30 to-slate-950/80"
      ></div>
      <div class="relative z-10 flex w-full flex-col items-center justify-center gap-6 px-4 text-center">
        <p class="text-sm uppercase tracking-[0.5em] text-slate-400">
          {{ heroCardName || "Commander" }}
        </p>
        <p class="text-xs uppercase tracking-[0.3em] text-slate-400">
          {{ heroSubtitle }}
        </p>
        <div v-if="heroCards.length" role="list" class="flex items-center justify-center gap-6 py-2">
          <article
            v-for="card in heroCards"
            :key="card.id"
            class="aspect-[63/88] w-[220px] overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-900/80 shadow-[0_10px_40px_-18px_rgba(0,0,0,0.7)]"
            role="listitem"
          >
            <img :src="getCardImageUrl(card)" :alt="card.name" class="h-full w-full object-cover" />
          </article>
        </div>
        <button
          type="button"
          class="rounded-full border border-fuchsia-400 bg-fuchsia-600/90 px-8 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.5em] text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
          @click="handleRandomize"
          :disabled="isLoading"
        >
          Randomise
        </button>
      </div>
    </div>
  </div>
</template>
