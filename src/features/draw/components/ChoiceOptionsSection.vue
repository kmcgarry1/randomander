<script setup lang="ts">
import { computed, type PropType } from "vue";
import { ArrowTopRightOnSquareIcon, SparklesIcon } from "@heroicons/vue/24/outline";
import type { ScryfallCard } from "../../../lib/scryfall";
import {
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getTypeLine,
  isBackgroundCard,
} from "../../../lib/scryfall";
import type { CommanderChoice } from "../../../stores/randomander";
import ManaIdentity from "../../../components/mtg/ManaIdentity.vue";
import PrestigeCard from "./PrestigeCard.vue";

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
  revealActive: { type: Boolean, default: false },
  revealComplete: { type: Boolean, default: false },
  revealDurationMs: { type: Number, default: 2400 },
});

const sectionLabel = computed(() =>
  props.choices.some((choice) => choice.cards.length > 1)
    ? "Compare pairings"
    : "Compare commanders",
);

const totalCards = computed(() =>
  props.choices.reduce((total, choice) => total + choice.cards.length, 0),
);

const globalCardIndex = (choiceIndex: number, cardIndex: number) =>
  props.choices
    .slice(0, choiceIndex)
    .reduce((total, choice) => total + choice.cards.length, 0) + cardIndex;

const getChoiceTitle = (choice: CommanderChoice) =>
  choice.cards.length === 2
    ? choice.cards.map((card) => card.name).join(" + ")
    : choice.cards[0]?.name ?? "Commander option";

const getEdhrecUrl = (card: ScryfallCard) =>
  isBackgroundCard(card)
    ? getEdhrecCardUrl(card)
    : getEdhrecCommanderUrl(card);
</script>

<template>
  <section class="px-1 py-3 sm:px-3 sm:py-5">
    <header class="mx-auto max-w-2xl text-center">
      <p class="m3-label">CHOICE MODE</p>
      <h2
        data-result-heading
        tabindex="-1"
        class="mt-1 text-2xl font-bold sm:text-3xl"
      >
        {{ revealComplete ? sectionLabel : "Preparing two options" }}
      </h2>
    </header>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      <article
        v-for="(choice, choiceIndex) in choices"
        :key="choice.id"
        class="rounded-[var(--md-sys-shape-corner-large)] bg-[var(--md-sys-color-surface-container)] p-4"
      >
        <div class="flex min-h-11 items-start justify-between gap-3">
          <div>
            <p class="m3-label">Option {{ choiceIndex + 1 }}</p>
          </div>
          <button
            v-if="
              revealComplete &&
              choice.cards.length === 1 &&
              choice.cards[0] &&
              props.canRandomizeChoicePartner(choice.cards[0])
            "
            type="button"
            class="m3-button m3-button--tonal min-h-10 px-3 py-2 text-xs"
            :disabled="isLoading"
            @click="props.onChoicePartner(choiceIndex)"
          >
            <SparklesIcon class="h-4 w-4" aria-hidden="true" />
            {{ props.getPartnerButtonLabel(choice.cards[0] ?? null) }}
          </button>
        </div>

        <div
          class="mt-4 flex min-h-[17rem] items-end justify-center gap-2 sm:min-h-[21rem]"
          role="list"
          :aria-label="`Cards in option ${choiceIndex + 1}`"
        >
          <div
            v-for="(card, cardIndex) in choice.cards"
            :key="card.id"
            class="w-[9.5rem] sm:w-[12.5rem]"
            :class="{
              '-rotate-2 translate-y-2': choice.cards.length > 1 && cardIndex === 0,
              'rotate-2': choice.cards.length > 1 && cardIndex === 1,
            }"
            role="listitem"
          >
            <PrestigeCard
              :card="card"
              :revealing="revealActive"
              :concealed="!revealComplete"
              :index="globalCardIndex(choiceIndex, cardIndex)"
              :total="totalCards"
              :total-duration-ms="revealDurationMs"
            />
          </div>
        </div>

        <div v-if="revealComplete" class="mt-5 border-t border-[var(--md-sys-color-outline-variant)] pt-4">
          <h3 class="text-lg font-bold leading-tight">{{ getChoiceTitle(choice) }}</h3>
          <div class="mt-3 space-y-2">
            <div
              v-for="card in choice.cards"
              :key="`${choice.id}-${card.id}-summary`"
              class="flex items-start gap-2 text-xs text-[var(--md-sys-color-on-surface-variant)]"
            >
              <ManaIdentity :colors="card.color_identity ?? []" compact />
              <span>{{ getTypeLine(card) }}</span>
            </div>
          </div>

          <div v-if="showLinks" class="mt-4 flex flex-wrap gap-1">
            <template v-for="card in choice.cards" :key="`${choice.id}-${card.id}-links`">
              <a
                :href="card.scryfall_uri"
                target="_blank"
                rel="noreferrer"
                class="m3-button m3-button--text min-h-9 px-2.5 py-1.5 text-xs"
              >
                {{ card.name }} Scryfall
                <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
              </a>
              <a
                :href="getEdhrecUrl(card)"
                target="_blank"
                rel="noreferrer"
                class="m3-button m3-button--text min-h-9 px-2.5 py-1.5 text-xs"
              >
                {{ card.name }} EDHREC
                <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </template>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
