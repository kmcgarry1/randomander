<script setup lang="ts">
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import {
  formatColorIdentity,
  getCardImageUrl,
  getEdhrecCommanderUrl,
  getTypeLine,
} from "../../../lib/scryfall";
import type { CommanderChoice } from "../../../stores/randomander";
import { useRandomanderStore } from "../../../stores/randomander";

const props = defineProps({
  choices: { type: Array as PropType<CommanderChoice[]>, required: true },
  isLoading: { type: Boolean, required: true },
  canRandomizeChoicePartner: {
    type: Function as PropType<(card: ScryfallCard) => boolean>,
    required: true,
  },
  onChoicePartner: {
    type: Function as PropType<(index: number) => void>,
    required: true,
  },
  getPartnerButtonLabel: {
    type: Function as PropType<(card: ScryfallCard | null) => string>,
    required: true,
  },
});

const store = useRandomanderStore();

const handlePartnerClick = (index: number) => {
  props.onChoicePartner(index);
};
</script>

<template>
  <section
    class="mt-6 w-full rounded-[2rem] border border-white/20 bg-slate-900/80 px-6 py-5 text-left text-slate-100 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur"
  >
    <div class="flex items-center justify-between">
      <p class="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
        Partner options
      </p>
      <p class="text-[0.6rem] uppercase tracking-[0.3em] text-slate-400">
        Choose a lead
      </p>
    </div>
    <p class="mt-1 text-[0.55rem] text-slate-300">
      These cards highlight the possible leads; use the buttons below to fill in any missing partners.
    </p>
    <div class="mt-4 grid gap-4 md:grid-cols-2">
      <article
        v-for="(choice, index) in choices"
        :key="choice.id"
        class="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold tracking-tight text-slate-100">
              Option {{ index + 1 }}
            </p>
            <p class="text-sm text-slate-300">
              {{
                choice.cards.length === 2
                  ? "Partner-ready accelerator"
                  : "Commander"
              }}
            </p>
          </div>
          <button
            v-if="
              choice.cards.length === 1 &&
              choice.cards[0] &&
              props.canRandomizeChoicePartner(choice.cards[0])
            "
            type="button"
            class="rounded-full border border-fuchsia-400 bg-fuchsia-600/90 px-4 py-1 text-[0.65rem] font-semibold tracking-tight text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
            :disabled="isLoading"
            @click="handlePartnerClick(index)"
          >
            {{ props.getPartnerButtonLabel(choice.cards[0] ?? null) }}
          </button>
        </div>
        <p
          v-if="choice.cards.length === 1"
          class="mt-1 text-[0.55rem] text-slate-400"
        >
          Tap the button to reveal a partner when one is missing; paired accelerators already contain both cards.
        </p>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <article
            v-for="card in choice.cards"
            :key="card.id"
            class="group flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-center"
          >
            <div class="aspect-[63/88] w-full overflow-hidden rounded-xl bg-slate-800 shadow-inner">
              <img
                v-if="getCardImageUrl(card)"
                :src="getCardImageUrl(card)"
                :alt="card.name"
                class="h-full w-full object-cover"
              />
            </div>
            <p class="text-[0.75rem] font-semibold tracking-tight text-slate-100">
              {{ card.name }}
            </p>
            <p class="text-[0.65rem] text-slate-400">
              {{ getTypeLine(card) }}
            </p>
            <div class="flex flex-wrap justify-center gap-2 text-[0.6rem] font-semibold text-slate-400">
              <a
                class="rounded-full border border-white/20 px-2 py-1 transition hover:border-white/60"
                :href="card.scryfall_uri"
                target="_blank"
                rel="noreferrer"
              >
                Scryfall
              </a>
              <a
                v-if="store.shouldShowTags(card)"
                class="rounded-full border border-white/20 px-2 py-1 transition hover:border-white/60"
                :href="getEdhrecCommanderUrl(card)"
                target="_blank"
                rel="noreferrer"
              >
                EDHREC
              </a>
            </div>
            <p class="text-[0.6rem] tracking-tight text-slate-400">
              {{ formatColorIdentity(card.color_identity) }}
            </p>
          </article>
        </div>
      </article>
    </div>
  </section>
</template>
