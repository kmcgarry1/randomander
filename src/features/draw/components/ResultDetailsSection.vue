<script setup lang="ts">
import { computed, onUnmounted, watchEffect } from "vue";
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import type { EdhrecTag } from "../../../services/edhrec";
import {
  formatColorIdentity,
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getTypeLine,
} from "../../../lib/scryfall";
import { useRandomanderStore } from "../../../stores/randomander";

const props = defineProps({
  cards: { type: Array as PropType<ScryfallCard[]>, required: true },
  group: { type: Array as PropType<ScryfallCard[]>, required: true },
  showLinks: { type: Boolean, default: true },
  showMetadata: { type: Boolean, default: true },
  pairLinkUrl: { type: String, default: "" },
});

const store = useRandomanderStore();

watchEffect(() => {
  store.setMetadataSurfaceVisible(props.showMetadata && props.group.length > 0);
});

onUnmounted(() => {
  store.setMetadataSurfaceVisible(false);
});

const detailCards = computed(() => props.cards.slice(0, 3));
const detailCount = computed(() => detailCards.value.length);
const combinedPairCard = computed(() =>
  detailCards.value.length === 2 && !!props.pairLinkUrl ? detailCards.value : null,
);

const getEdhrecUrl = (card: ScryfallCard) =>
  store.usesCommanderLink(card)
    ? getEdhrecCommanderUrl(card)
    : getEdhrecCardUrl(card);

const isLeadCard = (index: number) =>
  detailCount.value === 1 || (detailCount.value >= 3 && index === 0);

const getCardPanelClass = (index: number) => {
  if (detailCount.value === 1) {
    return "flex-[1_1_100%]";
  }
  if (detailCount.value === 2) {
    return "flex-[1_1_22rem]";
  }
  return index === 0 ? "flex-[1.35_1_24rem]" : "flex-[1_1_18rem]";
};

const getTitleClass = (index: number) =>
  isLeadCard(index) ? "text-lg sm:text-xl" : "text-base sm:text-lg";

const getTagUrl = (card: ScryfallCard, tag: EdhrecTag) =>
  store.getTagUrlForCard(card, props.group, tag);

const getCombinedDeckCount = (cards: ScryfallCard[]) =>
  store.getDeckCountForCard(cards[0]!, props.group);

const getCombinedColors = (cards: ScryfallCard[]) =>
  formatColorIdentity(
    Array.from(
      new Set(cards.flatMap((card) => card.color_identity ?? [])),
    ),
  );

const getCombinedTags = (cards: ScryfallCard[]) =>
  store.getTagsForCard(cards[0]!, props.group);
</script>

<template>
  <div class="space-y-4">
    <article
      v-if="combinedPairCard"
      class="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/92 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/64 sm:rounded-[1.9rem] sm:border-white/75 sm:bg-white/64 sm:shadow-[0_18px_45px_-34px_rgba(15,23,42,0.18)] sm:backdrop-blur-md"
    >
      <div class="flex h-full flex-col gap-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1 space-y-2">
            <p class="text-lg font-semibold text-slate-900 dark:text-white">
              {{ combinedPairCard.map((card) => card.name).join(" + ") }}
            </p>
            <div class="space-y-1.5">
              <p
                v-for="card in combinedPairCard"
                :key="`${card.id}-type`"
                class="text-sm leading-6 text-slate-500 dark:text-slate-400"
              >
                {{ card.name }} · {{ getTypeLine(card) }}
              </p>
            </div>
          </div>
          <div class="space-y-1 text-sm text-slate-500 dark:text-slate-400 sm:text-right">
            <p
              v-if="props.showMetadata && getCombinedDeckCount(combinedPairCard) != null"
            >
              {{ getCombinedDeckCount(combinedPairCard)?.toLocaleString() }} decks
            </p>
            <p>{{ getCombinedColors(combinedPairCard) }}</p>
          </div>
        </div>

        <div
          v-if="props.showLinks"
          class="grid gap-2 sm:flex sm:flex-wrap"
        >
          <a
            v-for="card in combinedPairCard"
            :key="`${card.id}-scryfall`"
            :href="card.scryfall_uri"
            target="_blank"
            rel="noreferrer"
            class="motion-chip inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[0.72rem] font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400 sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-3 sm:py-1 sm:text-[0.65rem] sm:uppercase sm:tracking-[0.2em]"
          >
            {{ card.name }} Scryfall
          </a>
          <a
            :href="props.pairLinkUrl"
            target="_blank"
            rel="noreferrer"
            class="motion-chip inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[0.72rem] font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900/72 dark:text-slate-300 dark:hover:border-slate-400 sm:min-h-0 sm:justify-start sm:px-3 sm:py-1 sm:text-[0.65rem] sm:uppercase sm:tracking-[0.2em]"
          >
            EDHREC pair
          </a>
        </div>

        <div
          v-if="props.showMetadata"
          class="flex min-h-8 flex-wrap items-center gap-2"
        >
          <p
            v-if="
              store.shouldRenderTagPanel(combinedPairCard[0]!) &&
              !store.hasTagEntry(combinedPairCard[0]!, props.group)
            "
            class="text-sm text-slate-500 dark:text-slate-400"
          >
            Loading tags...
          </p>
          <p
            v-else-if="
              store.hasTagEntry(combinedPairCard[0]!, props.group) &&
              getCombinedTags(combinedPairCard).length === 0
            "
            class="text-sm text-slate-500 dark:text-slate-400"
          >
            No tags yet
          </p>
          <a
            v-for="tag in getCombinedTags(combinedPairCard)"
            :key="tag.href"
            :href="getTagUrl(combinedPairCard[0]!, tag)"
            target="_blank"
            rel="noreferrer"
            class="motion-chip rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400"
          >
            {{ tag.label }}
          </a>
        </div>
      </div>
    </article>

    <div
      v-else
      class="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
    >
      <article
        v-for="(card, index) in detailCards"
        :key="card.id"
        class="min-w-0 rounded-[1.5rem] border border-slate-200/80 bg-slate-50/92 p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-900/64 sm:min-w-[16rem] sm:rounded-[1.8rem] sm:border-white/75 sm:bg-white/64 sm:shadow-[0_18px_45px_-34px_rgba(15,23,42,0.18)] sm:backdrop-blur-md"
        :class="getCardPanelClass(index)"
      >
        <div class="flex h-full flex-col gap-4">
          <div class="space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p
                  class="font-semibold text-slate-900 dark:text-white"
                  :class="getTitleClass(index)"
                >
                  {{ card.name }}
                </p>
                <p class="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ getTypeLine(card) }}
                </p>
              </div>
            </div>
            <div class="space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <p
                v-if="props.showMetadata && store.getDeckCountForCard(card, props.group) != null"
              >
                {{ store.getDeckCountForCard(card, props.group)?.toLocaleString() }}
                decks
              </p>
              <p>{{ formatColorIdentity(card.color_identity) }}</p>
            </div>
          </div>

          <div
            v-if="props.showLinks"
            class="grid gap-2 sm:flex sm:flex-wrap"
          >
            <a
              :href="card.scryfall_uri"
              target="_blank"
              rel="noreferrer"
              class="motion-chip inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[0.72rem] font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400 sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-3 sm:py-1 sm:text-[0.65rem] sm:uppercase sm:tracking-[0.2em]"
            >
              Scryfall
            </a>
            <a
              :href="getEdhrecUrl(card)"
              target="_blank"
              rel="noreferrer"
              class="motion-chip inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 py-2 text-[0.72rem] font-semibold text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400 sm:min-h-0 sm:justify-start sm:bg-transparent sm:px-3 sm:py-1 sm:text-[0.65rem] sm:uppercase sm:tracking-[0.2em]"
            >
              EDHREC
            </a>
          </div>

          <div
            v-if="props.showMetadata && store.shouldShowTags(card)"
            class="flex min-h-8 flex-wrap items-center gap-2"
          >
            <p
              v-if="
                store.shouldRenderTagPanel(card) &&
                !store.hasTagEntry(card, props.group)
              "
              class="text-sm text-slate-500 dark:text-slate-400"
            >
              Loading tags...
            </p>
            <p
              v-else-if="
                store.hasTagEntry(card, props.group) &&
                store.getTagsForCard(card, props.group).length === 0
              "
              class="text-sm text-slate-500 dark:text-slate-400"
            >
              No tags yet
            </p>
            <a
              v-for="tag in store.getTagsForCard(card, props.group)"
              :key="tag.href"
              :href="getTagUrl(card, tag)"
              target="_blank"
              rel="noreferrer"
              class="motion-chip rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400"
            >
              {{ tag.label }}
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
