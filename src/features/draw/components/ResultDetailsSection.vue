<script setup lang="ts">
import { computed, type PropType } from "vue";
import { TagIcon } from "@heroicons/vue/24/outline";
import type { ScryfallCard } from "../../../lib/scryfall";
import type { EdhrecTag } from "../../../services/edhrec";
import {
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getSafeEdhrecUrl,
  getSafeScryfallUrl,
  getTypeLine,
} from "../../../lib/scryfall";
import { useRandomanderStore } from "../../../stores/randomander";
import ExternalLinkHint from "../../../components/ExternalLinkHint.vue";
import ManaIdentity from "../../../components/mtg/ManaIdentity.vue";
import CardPriceBadge from "./CardPriceBadge.vue";
import CardRulesText from "./CardRulesText.vue";

const props = defineProps({
  cards: { type: Array as PropType<ScryfallCard[]>, required: true },
  group: { type: Array as PropType<ScryfallCard[]>, required: true },
  showLinks: { type: Boolean, default: true },
  showMetadata: { type: Boolean, default: true },
  pairLinkUrl: { type: String, default: "" },
});

const store = useRandomanderStore();
const detailCards = computed(() => props.cards.slice(0, 3));
const safePairLinkUrl = computed(() => getSafeEdhrecUrl(props.pairLinkUrl) ?? "");
const combinedPair = computed(() =>
  detailCards.value.length === 2 && props.pairLinkUrl ? detailCards.value : null,
);

const getEdhrecUrl = (card: ScryfallCard) =>
  store.usesCommanderLink(card)
    ? getEdhrecCommanderUrl(card)
    : getEdhrecCardUrl(card);

const getTagUrl = (card: ScryfallCard, tag: EdhrecTag) =>
  getSafeEdhrecUrl(store.getTagUrlForCard(card, props.group, tag)) ?? "";

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

const pairMetadataState = computed(() =>
  combinedPair.value
    ? store.getMetadataStateForCard(combinedPair.value[0]!, props.group)
    : { status: "idle" as const, error: "" },
);

const retryMetadata = (card: ScryfallCard) => {
  store.retryMetadataForCard(card, props.group);
};
</script>

<template>
  <div class="min-w-0 max-w-full space-y-4">
    <article v-if="combinedPair" class="min-w-0 max-w-full space-y-4">
      <div class="min-w-0 max-w-full">
        <p class="m3-label">PAIR PROFILE</p>
        <h3 class="mt-1 max-w-full break-words text-base font-bold leading-snug [overflow-wrap:anywhere]">
          {{ combinedPair.map((card) => card.name).join(" + ") }}
        </h3>
        <p
          v-if="showMetadata && pairDeckCount != null"
          class="mt-2 inline-flex rounded-lg bg-[var(--md-sys-color-tertiary-container)] px-2.5 py-1 text-sm font-bold text-[var(--md-sys-color-on-tertiary-container)]"
        >
          {{ pairDeckCount.toLocaleString() }} decks
        </p>
      </div>

      <div class="min-w-0 max-w-full space-y-3">
        <div
          v-for="card in combinedPair"
          :key="`${card.id}-detail`"
          class="min-w-0 max-w-full rounded-2xl bg-[var(--md-sys-color-surface-container-high)] p-3"
        >
          <p class="max-w-full break-words text-sm font-bold [overflow-wrap:anywhere]">{{ card.name }}</p>
          <p class="mt-1 max-w-full break-words text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)] [overflow-wrap:anywhere]">
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
          <CardRulesText
            :card="card"
            :show-identity="(card.card_faces?.length ?? 0) > 0"
            class="mt-3"
          />
        </div>
      </div>

      <div v-if="showLinks" class="flex min-w-0 max-w-full flex-wrap gap-1">
        <template v-for="card in combinedPair" :key="`${card.id}-scryfall`">
          <a
            v-if="getSafeScryfallUrl(card)"
            :href="getSafeScryfallUrl(card) ?? undefined"
            target="_blank"
            rel="noreferrer"
            class="m3-button m3-button--text min-h-9 min-w-0 max-w-full flex-wrap whitespace-normal px-2 py-1 text-center text-xs [overflow-wrap:anywhere]"
          >
            <span class="min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
              {{ card.name }} Scryfall
            </span>
            <ExternalLinkHint class="shrink-0" />
          </a>
          <span
            v-else
            class="m3-button m3-button--text min-h-9 min-w-0 max-w-full flex-wrap whitespace-normal px-2 py-1 text-center text-xs opacity-70 [overflow-wrap:anywhere]"
          >
            <span class="min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]">
              {{ card.name }} Scryfall unavailable
            </span>
          </span>
        </template>
        <a
          v-if="safePairLinkUrl"
          :href="safePairLinkUrl"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 max-w-full whitespace-normal break-words px-2 py-1 text-center text-xs [overflow-wrap:anywhere]"
        >
          EDHREC pair
          <ExternalLinkHint />
        </a>
        <span
          v-else
          class="m3-button m3-button--text min-h-9 max-w-full whitespace-normal break-words px-2 py-1 text-center text-xs opacity-70 [overflow-wrap:anywhere]"
        >
          EDHREC pair unavailable
        </span>
      </div>

      <div v-if="showMetadata" class="min-w-0 max-w-full border-t border-[var(--md-sys-color-outline-variant)] pt-4">
        <p class="m3-label flex items-center gap-1.5">
          <TagIcon class="h-4 w-4" aria-hidden="true" />
          DECK THEMES
        </p>
        <div
          v-if="pairMetadataState.status === 'idle'"
          class="mt-2"
          role="status"
        >
          <p class="text-sm text-[var(--md-sys-color-on-surface-variant)]">
            EDHREC themes are ready to load.
          </p>
          <button
            type="button"
            class="m3-button m3-button--text mt-2 min-h-9 px-2 py-1 text-xs"
            @click="retryMetadata(combinedPair[0]!)"
          >
            Load metadata
          </button>
        </div>
        <p
          v-else-if="pairMetadataState.status === 'loading'"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
          role="status"
        >
          Loading EDHREC themes...
        </p>
        <div
          v-else-if="pairMetadataState.status === 'error'"
          class="mt-2 rounded-xl bg-[var(--md-sys-color-error-container)] p-3 text-sm text-[var(--md-sys-color-on-error-container)]"
          role="alert"
        >
          <p>{{ pairMetadataState.error }}</p>
          <button
            type="button"
            class="m3-button m3-button--text mt-2 min-h-9 px-2 py-1 text-xs"
            @click="retryMetadata(combinedPair[0]!)"
          >
            Retry metadata
          </button>
        </div>
        <p
          v-else-if="pairMetadataState.status === 'success-empty'"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
        >
          No themes available.
        </p>
        <div v-else class="mt-2 flex min-w-0 max-w-full flex-wrap gap-2">
          <template v-for="tag in pairTags" :key="tag.href">
            <a
              v-if="getTagUrl(combinedPair[0]!, tag)"
              :href="getTagUrl(combinedPair[0]!, tag)"
              target="_blank"
              rel="noreferrer"
              class="m3-chip min-w-0 max-w-full flex-wrap whitespace-normal"
            >
              <span class="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{{ tag.label }}</span>
              <ExternalLinkHint class="shrink-0" />
            </a>
            <span v-else class="m3-chip max-w-full whitespace-normal break-words [overflow-wrap:anywhere]" aria-disabled="true">{{ tag.label }}</span>
          </template>
        </div>
      </div>
    </article>

    <template v-else>
    <article
      v-for="card in detailCards"
      :key="card.id"
      class="min-w-0 max-w-full space-y-4"
    >
      <div class="min-w-0 max-w-full">
        <p class="m3-label">CARD PROFILE</p>
        <h3 class="mt-1 max-w-full break-words text-base font-bold leading-snug [overflow-wrap:anywhere]">{{ card.name }}</h3>
        <p class="mt-1 max-w-full break-words text-sm leading-5 text-[var(--md-sys-color-on-surface-variant)] [overflow-wrap:anywhere]">
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
        <CardRulesText
          :card="card"
          :show-identity="(card.card_faces?.length ?? 0) > 0"
          class="mt-3"
        />
      </div>

      <div v-if="showLinks" class="flex min-w-0 max-w-full flex-wrap gap-1">
        <a
          v-if="getSafeScryfallUrl(card)"
          :href="getSafeScryfallUrl(card) ?? undefined"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 max-w-full whitespace-normal break-words px-2 py-1 text-center text-xs [overflow-wrap:anywhere]"
        >
          Scryfall
          <ExternalLinkHint />
        </a>
        <span
          v-else
          class="m3-button m3-button--text min-h-9 max-w-full whitespace-normal break-words px-2 py-1 text-center text-xs opacity-70 [overflow-wrap:anywhere]"
        >
          Scryfall unavailable
        </span>
        <a
          v-if="getEdhrecUrl(card)"
          :href="getEdhrecUrl(card) ?? undefined"
          target="_blank"
          rel="noreferrer"
          class="m3-button m3-button--text min-h-9 max-w-full whitespace-normal break-words px-2 py-1 text-center text-xs [overflow-wrap:anywhere]"
        >
          EDHREC
          <ExternalLinkHint />
        </a>
        <span
          v-else
          class="m3-button m3-button--text min-h-9 max-w-full whitespace-normal break-words px-2 py-1 text-center text-xs opacity-70 [overflow-wrap:anywhere]"
        >
          EDHREC unavailable
        </span>
      </div>

      <div
        v-if="showMetadata && store.shouldShowTags(card)"
        class="min-w-0 max-w-full border-t border-[var(--md-sys-color-outline-variant)] pt-4"
      >
        <p class="m3-label flex items-center gap-1.5">
          <TagIcon class="h-4 w-4" aria-hidden="true" />
          DECK THEMES
        </p>
        <div
          v-if="store.getMetadataStateForCard(card, group).status === 'idle'"
          class="mt-2"
          role="status"
        >
          <p class="text-sm text-[var(--md-sys-color-on-surface-variant)]">
            EDHREC themes are ready to load.
          </p>
          <button
            type="button"
            class="m3-button m3-button--text mt-2 min-h-9 px-2 py-1 text-xs"
            @click="retryMetadata(card)"
          >
            Load metadata
          </button>
        </div>
        <p
          v-else-if="store.getMetadataStateForCard(card, group).status === 'loading'"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
          role="status"
        >
          Loading EDHREC themes...
        </p>
        <div
          v-else-if="store.getMetadataStateForCard(card, group).status === 'error'"
          class="mt-2 rounded-xl bg-[var(--md-sys-color-error-container)] p-3 text-sm text-[var(--md-sys-color-on-error-container)]"
          role="alert"
        >
          <p>{{ store.getMetadataStateForCard(card, group).error }}</p>
          <button
            type="button"
            class="m3-button m3-button--text mt-2 min-h-9 px-2 py-1 text-xs"
            @click="retryMetadata(card)"
          >
            Retry metadata
          </button>
        </div>
        <p
          v-else-if="store.getMetadataStateForCard(card, group).status === 'success-empty'"
          class="mt-2 text-sm text-[var(--md-sys-color-on-surface-variant)]"
        >
          No themes available.
        </p>
        <div v-else class="mt-2 flex min-w-0 max-w-full flex-wrap gap-2">
          <template
            v-for="tag in store.getTagsForCard(card, group)"
            :key="tag.href"
          >
            <a
              v-if="getTagUrl(card, tag)"
              :href="getTagUrl(card, tag)"
              target="_blank"
              rel="noreferrer"
              class="m3-chip min-w-0 max-w-full flex-wrap whitespace-normal"
            >
              <span class="min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{{ tag.label }}</span>
              <ExternalLinkHint class="shrink-0" />
            </a>
            <span v-else class="m3-chip max-w-full whitespace-normal break-words [overflow-wrap:anywhere]" aria-disabled="true">{{ tag.label }}</span>
          </template>
        </div>
      </div>
    </article>
    </template>
  </div>
</template>
