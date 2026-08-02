<script setup lang="ts">
import { computed, type PropType } from "vue";
import { ArrowTopRightOnSquareIcon, TagIcon } from "@heroicons/vue/24/outline";
import type { ScryfallCard } from "../../../lib/scryfall";
import type { EdhrecTag } from "../../../services/edhrec";
import {
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getTypeLine,
} from "../../../lib/scryfall";
import { useRandomanderStore } from "../../../stores/randomander";
import ManaIdentity from "../../../components/mtg/ManaIdentity.vue";
import CardPriceBadge from "./CardPriceBadge.vue";

const props = defineProps({
  cards: { type: Array as PropType<ScryfallCard[]>, required: true },
  group: { type: Array as PropType<ScryfallCard[]>, required: true },
  showLinks: { type: Boolean, default: true },
  showMetadata: { type: Boolean, default: true },
  pairLinkUrl: { type: String, default: "" },
});

const store = useRandomanderStore();
const detailCards = computed(() => props.cards.slice(0, 3));
const combinedPair = computed(() =>
  detailCards.value.length === 2 && props.pairLinkUrl ? detailCards.value : null,
);

const getEdhrecUrl = (card: ScryfallCard) =>
  store.usesCommanderLink(card)
    ? getEdhrecCommanderUrl(card)
    : getEdhrecCardUrl(card);

const getTagUrl = (card: ScryfallCard, tag: EdhrecTag) =>
  store.getTagUrlForCard(card, props.group, tag);

const pairDeckCount = computed(() =>
  combinedPair.value
    ? store.getDeckCountForCard(combinedPair.value[0]!, props.group)
    : null,
);

const pairTags = computed(() =>
  combinedPair.value
    ? store.getTagsForCard(combinedPair.value[0]!, props.group)
    : [],
);
</script>

<template>
  <div class="space-y-4">
    <article v-if="combinedPair" class="space-y-4">
      <div>
        <p class="m3-label">PAIR PROFILE</p>
        <h3 class="mt-1 text-base font-bold leading-snug">
          {{ combinedPair.map((card) => card.name).join(" + ") }}
        </h3>
        <p
          v-if="showMetadata && pairDeckCount != null"
          class="mt-2 inline-flex rounded-lg bg-[var(--md-sys-color-tertiary-container)] px-2.5 py-1 text-sm font-bold text-[var(--md-sys-color-on-tertiary-container)]"
        >
          {{ pairDeckCount.toLocaleString() }} decks
        </p>
      </div>

      <div class="space-y-3">
        <div
          v-for="card in combinedPair"
          :key="`${card.id}-detail`"
          class="rounded-2xl bg-[var(--md-sys-color-surface-container-high)] p-3"
        >
          <p class="text-sm font-bold">{{ card.name }}</p>
          <p class="mt-1 text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]">
            {{ getTypeLine(card) }}
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <ManaIdentity :colors="card.color_identity ?? []" compact />
            <CardPriceBadge
              :card="card"
              :provider="store.display.priceProvider"
              :show-link="showLinks"
            />
          </div>
        </div>
      </div>

      <div v-if="showLinks" class="flex flex-wrap gap-1">
        <a
          v-for="card in combinedPair"
          :key="`${card.id}-scryfall`"
          :href="card.scryfall_uri"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 px-2 py-1 text-xs"
        >
          {{ card.name }} Scryfall
          <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <a
          :href="pairLinkUrl"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 px-2 py-1 text-xs"
        >
          EDHREC pair
          <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div v-if="showMetadata" class="border-t border-[var(--md-sys-color-outline-variant)] pt-4">
        <p class="m3-label flex items-center gap-1.5">
          <TagIcon class="h-4 w-4" aria-hidden="true" />
          DECK THEMES
        </p>
        <p
          v-if="!store.hasTagEntry(combinedPair[0]!, group)"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
          role="status"
        >
          Loading EDHREC themes...
        </p>
        <p
          v-else-if="pairTags.length === 0"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
        >
          No themes available.
        </p>
        <div v-else class="mt-2 flex flex-wrap gap-2">
          <a
            v-for="tag in pairTags"
            :key="tag.href"
            :href="getTagUrl(combinedPair[0]!, tag)"
            target="_blank"
            rel="noreferrer"
            class="m3-chip"
          >
            {{ tag.label }}
          </a>
        </div>
      </div>
    </article>

    <template v-else>
    <article
      v-for="card in detailCards"
      :key="card.id"
      class="space-y-4"
    >
      <div>
        <p class="m3-label">CARD PROFILE</p>
        <h3 class="mt-1 text-base font-bold leading-snug">{{ card.name }}</h3>
        <p class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)]">
          {{ getTypeLine(card) }}
        </p>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <ManaIdentity :colors="card.color_identity ?? []" compact />
          <CardPriceBadge
            :card="card"
            :provider="store.display.priceProvider"
            :show-link="showLinks"
          />
          <span
            v-if="showMetadata && store.getDeckCountForCard(card, group) != null"
            class="rounded-lg bg-[var(--md-sys-color-tertiary-container)] px-2.5 py-1 text-sm font-bold text-[var(--md-sys-color-on-tertiary-container)]"
          >
            {{ store.getDeckCountForCard(card, group)?.toLocaleString() }} decks
          </span>
        </div>
      </div>

      <div v-if="showLinks" class="flex flex-wrap gap-1">
        <a
          :href="card.scryfall_uri"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 px-2 py-1 text-xs"
        >
          Scryfall
          <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
        <a
          :href="getEdhrecUrl(card)"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 px-2 py-1 text-xs"
        >
          EDHREC
          <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>

      <div
        v-if="showMetadata && store.shouldShowTags(card)"
        class="border-t border-[var(--md-sys-color-outline-variant)] pt-4"
      >
        <p class="m3-label flex items-center gap-1.5">
          <TagIcon class="h-4 w-4" aria-hidden="true" />
          DECK THEMES
        </p>
        <p
          v-if="!store.hasTagEntry(card, group)"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
          role="status"
        >
          Loading EDHREC themes...
        </p>
        <p
          v-else-if="store.getTagsForCard(card, group).length === 0"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
        >
          No themes available.
        </p>
        <div v-else class="mt-2 flex flex-wrap gap-2">
          <a
            v-for="tag in store.getTagsForCard(card, group)"
            :key="tag.href"
            :href="getTagUrl(card, tag)"
            target="_blank"
            rel="noreferrer"
            class="m3-chip"
          >
            {{ tag.label }}
          </a>
        </div>
      </div>
    </article>
    </template>
  </div>
</template>
