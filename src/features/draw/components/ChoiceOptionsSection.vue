<script setup lang="ts">
import type { PropType } from "vue";
import { computed } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import {
  formatColorIdentity,
  getCardImageUrl,
  getEdhrecCommanderUrl,
  getTypeLine,
} from "../../../lib/scryfall";
import type { CommanderChoice } from "../../../stores/randomander";

const props = defineProps({
  choices: { type: Array as PropType<CommanderChoice[]>, required: true },
  isLoading: { type: Boolean, required: true },
  showLinks: { type: Boolean, default: true },
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

const sectionLabel = computed(() =>
  props.choices.some((choice) => choice.cards.length > 1)
    ? "Compare pairings"
    : "Compare commanders",
);

const handlePartnerClick = (index: number) => {
  props.onChoicePartner(index);
};

const getChoiceTitle = (choice: CommanderChoice) =>
  choice.cards.length === 2
    ? choice.cards.map((card) => card.name).join(" + ")
    : choice.cards[0]?.name ?? "Commander option";
</script>

<template>
  <section class="space-y-5">
    <div class="mx-auto max-w-2xl text-center">
      <p
        class="text-[0.65rem] uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400"
      >
        Choice mode
      </p>
      <h2 class="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
        {{ sectionLabel }}
      </h2>
      <p class="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Put the two reveals side by side, inspect the art, then expand a
        missing partner or background only if one option deserves it.
      </p>
    </div>

    <div class="motion-stagger grid gap-5 lg:grid-cols-2">
      <article
        v-for="(choice, index) in choices"
        :key="choice.id"
        class="rounded-[2.2rem] border border-white/75 bg-white/50 p-4 shadow-[0_20px_50px_-36px_rgba(15,23,42,0.2)] backdrop-blur-lg dark:border-slate-700/60 dark:bg-slate-950/50"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <p
              class="text-[0.65rem] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400"
            >
              Option {{ index + 1 }}
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ choice.cards.length }} card{{ choice.cards.length === 1 ? "" : "s" }}
            </p>
          </div>
          <button
            v-if="
              choice.cards.length === 1 &&
              choice.cards[0] &&
              props.canRandomizeChoicePartner(choice.cards[0])
            "
            type="button"
            class="motion-press rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
            :disabled="isLoading"
            @click="handlePartnerClick(index)"
          >
            {{ props.getPartnerButtonLabel(choice.cards[0] ?? null) }}
          </button>
        </div>

        <div class="mt-5 flex min-h-[24rem] flex-wrap items-end justify-center gap-3 sm:min-h-[26rem]">
          <article
            v-for="card in choice.cards"
            :key="card.id"
            class="motion-card motion-card-hover relative w-[11.5rem] sm:w-[13rem] lg:w-[14rem]"
          >
            <div
              class="absolute inset-4 rounded-[1.6rem] bg-white/50 blur-3xl dark:bg-slate-700/20"
              aria-hidden="true"
            ></div>
            <div
              class="relative aspect-[63/88] overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/92 shadow-[0_26px_55px_-32px_rgba(15,23,42,0.45)] dark:border-slate-700/60 dark:bg-slate-900/92"
            >
              <img
                v-if="getCardImageUrl(card)"
                :src="getCardImageUrl(card)"
                :alt="card.name"
                class="h-full w-full object-cover"
              />
            </div>
          </article>
        </div>

        <div
          class="mt-4 rounded-[1.8rem] border border-white/75 bg-white/58 p-4 shadow-sm backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/58"
        >
          <p class="text-lg font-semibold text-slate-900 dark:text-white">
            {{ getChoiceTitle(choice) }}
          </p>
          <div class="mt-2 space-y-1">
            <p
              v-for="card in choice.cards"
              :key="`${choice.id}-${card.id}-type`"
              class="text-xs text-slate-500 dark:text-slate-400"
            >
              {{ card.name }} · {{ getTypeLine(card) }}
            </p>
          </div>
          <p class="mt-3 text-[0.72rem] text-slate-600 dark:text-slate-300">
            {{
              choice.cards
                .map((card) => formatColorIdentity(card.color_identity))
                .join(" / ")
            }}
          </p>
          <div
            v-if="props.showLinks"
            class="mt-4 flex flex-wrap gap-2 text-[0.65rem]"
          >
            <a
              v-for="card in choice.cards"
              :key="`${choice.id}-${card.id}-scryfall`"
              :href="card.scryfall_uri"
              target="_blank"
              rel="noreferrer"
              class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
            >
              {{ card.name }} Scryfall
            </a>
            <a
              v-for="card in choice.cards"
              :key="`${choice.id}-${card.id}-edhrec`"
              :href="getEdhrecCommanderUrl(card)"
              target="_blank"
              rel="noreferrer"
              class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
            >
              {{ card.name }} EDHREC
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
