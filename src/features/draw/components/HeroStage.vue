<script setup lang="ts">
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getCardImageUrl } from "../../../lib/scryfall";

const props = defineProps({
  stageTitle: { type: String, required: true },
  heroCardName: { type: String, default: "" },
  heroSubtitle: { type: String, default: "" },
  heroCards: { type: Array as PropType<ScryfallCard[]>, required: true },
});
</script>

<template>
  <div
    class="mx-auto w-full max-w-[min(92vw,1100px)] rounded-[2.5rem] border border-slate-800 bg-slate-950 text-white shadow-[0_30px_60px_-40px_rgba(2,4,16,0.8)] px-4 py-6"
  >
    <div class="relative overflow-hidden rounded-[2rem] bg-slate-950/40">
      <div class="max-h-[70vh] overflow-y-auto px-4 py-6" aria-live="polite">
        <div
          class="grid gap-4 md:grid-cols-3"
          :class="heroCards.length > 1 ? 'sm:grid-cols-2 grid-cols-1' : 'grid-cols-1'"
          role="list"
          aria-label="Commander cards"
        >
          <article
            v-for="card in heroCards"
            :key="card.id"
            class="flex flex-col gap-2 rounded-[1.6rem] border border-white/10 bg-slate-900 shadow-[0_15px_35px_-20px_rgba(0,0,0,0.8)]"
            role="listitem"
          >
            <div class="aspect-[63/88] w-full">
              <img
                :src="getCardImageUrl(card)"
                :alt="card.name"
                class="h-full w-full object-cover"
              />
            </div>
          </article>
          <article
            v-if="!heroCards.length"
            class="flex h-[360px] w-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/30 bg-slate-900/60 text-[0.75rem] uppercase tracking-[0.3em] text-slate-400"
            role="listitem"
          >
            Pull a commander
          </article>
        </div>
      </div>
    </div>
    <div class="mt-4 px-4">
      <p class="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
        Commander studio
      </p>
      <h2 class="text-3xl font-semibold text-white">{{ heroCardName || stageTitle }}</h2>
      <p class="text-sm text-slate-300">{{ heroSubtitle }}</p>
    </div>
  </div>
</template>
