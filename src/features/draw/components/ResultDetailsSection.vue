<script setup lang="ts">
import { computed, onUnmounted, watchEffect } from "vue";
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import type { EdhrecTag } from "../../../services/edhrec";
import {
  formatColorIdentity,
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getCardImageUrl,
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

const getPreviewClass = (index: number) =>
  isLeadCard(index)
    ? "h-24 w-[4.4rem] rounded-[1.15rem] sm:h-28 sm:w-[5.2rem]"
    : "h-20 w-14 rounded-[1rem]";

const getTitleClass = (index: number) =>
  isLeadCard(index) ? "text-base sm:text-lg" : "text-sm";

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
    <div
      v-if="props.showLinks && props.pairLinkUrl"
      class="flex justify-end"
    >
      <a
        :href="props.pairLinkUrl"
        target="_blank"
        rel="noreferrer"
        class="motion-chip rounded-full border border-slate-200/80 bg-white/72 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900/72 dark:text-slate-300 dark:hover:border-slate-400"
      >
        EDHREC pair
      </a>
    </div>

    <article
      v-if="combinedPairCard"
      class="rounded-[1.9rem] border border-white/75 bg-white/64 p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.18)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/64"
    >
      <div class="flex h-full flex-col gap-4">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div class="flex justify-center -space-x-4 sm:justify-start">
            <img
              v-for="card in combinedPairCard"
              :key="`${card.id}-preview`"
              :src="getCardImageUrl(card)"
              :alt="card.name"
              class="h-24 w-[4.4rem] rounded-[1.15rem] border border-white/80 object-cover shadow-[0_10px_22px_-16px_rgba(15,23,42,0.35)] dark:border-slate-700/60 sm:h-28 sm:w-[5.2rem]"
              loading="lazy"
            />
          </div>

          <div class="min-w-0 flex-1 space-y-3">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-base font-semibold text-slate-900 dark:text-white sm:text-lg">
                  {{ combinedPairCard.map((card) => card.name).join(" + ") }}
                </p>
                <div class="mt-2 space-y-1">
                  <p
                    v-for="card in combinedPairCard"
                    :key="`${card.id}-type`"
                    class="text-xs text-slate-500 dark:text-slate-400"
                  >
                    {{ card.name }} · {{ getTypeLine(card) }}
                  </p>
                </div>
              </div>
              <p
                v-if="props.showMetadata && getCombinedDeckCount(combinedPairCard) != null"
                class="shrink-0 text-[0.72rem] text-slate-500 dark:text-slate-400"
              >
                {{ getCombinedDeckCount(combinedPairCard)?.toLocaleString() }}
                decks
              </p>
            </div>

            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ getCombinedColors(combinedPairCard) }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 text-[0.65rem]">
          <a
            v-for="card in combinedPairCard"
            :key="`${card.id}-scryfall`"
            :href="card.scryfall_uri"
            target="_blank"
            rel="noreferrer"
            class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
          >
            {{ card.name }} Scryfall
          </a>
          <a
            :href="props.pairLinkUrl"
            target="_blank"
            rel="noreferrer"
            class="motion-chip rounded-full border border-slate-200/80 bg-white/72 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900/72 dark:text-slate-300 dark:hover:border-slate-400"
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
            class="text-[0.65rem] text-slate-500 dark:text-slate-400"
          >
            Loading tags...
          </p>
          <p
            v-else-if="
              store.hasTagEntry(combinedPairCard[0]!, props.group) &&
              getCombinedTags(combinedPairCard).length === 0
            "
            class="text-[0.65rem] text-slate-500 dark:text-slate-400"
          >
            No tags yet
          </p>
          <a
            v-for="tag in getCombinedTags(combinedPairCard)"
            :key="tag.href"
            :href="getTagUrl(combinedPairCard[0]!, tag)"
            target="_blank"
            rel="noreferrer"
            class="motion-chip rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400"
          >
            {{ tag.label }}
          </a>
        </div>
      </div>
    </article>

    <div
      v-else
      class="flex flex-wrap items-stretch gap-4"
    >
      <article
        v-for="(card, index) in detailCards"
        :key="card.id"
        class="min-w-[16rem] rounded-[1.8rem] border border-white/75 bg-white/64 p-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.18)] backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/64"
        :class="getCardPanelClass(index)"
      >
        <div class="flex h-full flex-col gap-4">
          <div class="flex items-start gap-4">
            <img
              :src="getCardImageUrl(card)"
              :alt="card.name"
              class="border border-white/80 object-cover shadow-[0_10px_22px_-16px_rgba(15,23,42,0.35)] dark:border-slate-700/60"
              :class="getPreviewClass(index)"
              loading="lazy"
            />
            <div class="min-w-0 flex-1 space-y-2">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p
                    class="font-semibold text-slate-900 dark:text-white"
                    :class="getTitleClass(index)"
                  >
                    {{ card.name }}
                  </p>
                  <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ getTypeLine(card) }}
                  </p>
                </div>
                <p
                  v-if="props.showMetadata && store.getDeckCountForCard(card, props.group) != null"
                  class="shrink-0 text-[0.72rem] text-slate-500 dark:text-slate-400"
                >
                  {{ store.getDeckCountForCard(card, props.group)?.toLocaleString() }}
                  decks
                </p>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                {{ formatColorIdentity(card.color_identity) }}
              </p>
            </div>
          </div>
          <div
            v-if="props.showLinks"
            class="flex flex-wrap gap-2 text-[0.65rem]"
          >
            <a
              :href="card.scryfall_uri"
              target="_blank"
              rel="noreferrer"
              class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
            >
              Scryfall
            </a>
            <a
              :href="getEdhrecUrl(card)"
              target="_blank"
              rel="noreferrer"
              class="motion-chip rounded-full border border-slate-200/80 px-3 py-1 uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:text-slate-300 dark:hover:border-slate-400"
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
              class="text-[0.65rem] text-slate-500 dark:text-slate-400"
            >
              Loading tags...
            </p>
            <p
              v-else-if="
                store.hasTagEntry(card, props.group) &&
                store.getTagsForCard(card, props.group).length === 0
              "
              class="text-[0.65rem] text-slate-500 dark:text-slate-400"
            >
              No tags yet
            </p>
            <a
              v-for="tag in store.getTagsForCard(card, props.group)"
              :key="tag.href"
              :href="getTagUrl(card, tag)"
              target="_blank"
              rel="noreferrer"
              class="motion-chip rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-400 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-400"
            >
              {{ tag.label }}
            </a>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
