<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import {
  modes,
  useRandomanderStore,
  type Mode,
} from "../../stores/randomander";
import {
  formatColorIdentity,
  getCardImageUrl,
  getEdhrecCardUrl,
  getEdhrecCommanderUrl,
  getPartnerKind,
} from "../../lib/scryfall";
import type { ScryfallCard } from "../../lib/scryfall";

const store = useRandomanderStore();
const {
  mode,
  display,
  cards,
  choices,
  isChoiceMode,
  isFirstLoad,
  isLoading,
  errorMessage,
  colorFilterLabel,
  summaryChips,
  stageTitle,
  statusText,
  canRandomizePartner,
  partnerButtonLabel,
} = storeToRefs(store);

const galleryLayoutClass = computed(() => {
  const count = galleryItemCount.value;
  if (count <= 1) return "flex justify-center";
  if (count === 2) return "grid gap-6 justify-items-center sm:grid-cols-2";
  return "grid gap-6 justify-items-center sm:grid-cols-2 lg:grid-cols-3";
});

const galleryContainerClass = computed(() => {
  const count = galleryItemCount.value;
  if (count <= 1) return "mx-auto max-w-3xl";
  if (count === 2) return "mx-auto max-w-5xl";
  return "mx-auto max-w-6xl";
});

const cardWidthClass = (count: number) => {
  if (count <= 1) return "w-full max-w-[22rem]";
  if (count === 2) return "w-full max-w-[18rem]";
  return "w-full max-w-[16rem]";
};

const showTagPanel = (
  card: ScryfallCard,
  group: ScryfallCard[],
  index: number,
) => {
  if (!display.value.showTags || mode.value === "spark") return false;
  if (!store.usesCommanderLink(card)) return false;
  if (display.value.usePairTags && group.length === 2) {
    return index === 0;
  }
  return true;
};

const getTagLabel = (card: ScryfallCard, group: ScryfallCard[]) =>
  store.getTagsForCard(card, group);

const hasTagEntry = (card: ScryfallCard, group: ScryfallCard[]) =>
  store.hasTagEntry(card, group);

const getTaggableCards = (group: ScryfallCard[]) =>
  group.filter((card) => store.usesCommanderLink(card));

const showTagCard = computed(() => {
  if (!display.value.showTags || mode.value === "spark") return false;
  return getTaggableCards(cards.value).length > 0;
});

const galleryItemCount = computed(
  () => cards.value.length + (showTagCard.value ? 1 : 0),
);

const primaryTagCard = computed(() => getTaggableCards(cards.value)[0] ?? null);

const partnerSlug = computed(() => {
  if (cards.value.length !== 2) return null;
  const slug = store.getPartnerSlugForGroup(cards.value);
  return slug?.length ? slug : null;
});

const partnerLinkUrl = computed(() =>
  partnerSlug.value ? `https://edhrec.com/commanders/${partnerSlug.value}` : undefined,
);

const partnerCardsAreCommanders = computed(
  () =>
    cards.value.length === 2 &&
    cards.value.every((card: ScryfallCard) => store.usesCommanderLink(card)),
);

const showPartnerLink = computed(
  () =>
    display.value.showLinks &&
    mode.value !== 'spark' &&
    partnerLinkUrl.value != null &&
    partnerCardsAreCommanders.value,
);

const canRandomizeChoicePartner = (card: ScryfallCard) =>
  getPartnerKind(card) !== null;

const handleRandomize = () => {
  store.randomize();
};

const handleOptions = () => {
  store.openOptions();
};

const handlePartner = () => {
  store.randomizePartnerForPrimary();
};

const handleChoicePartner = (index: number) => {
  store.randomizePartnerForChoice(index);
};

const setMode = (next: Mode) => {
  store.mode = next;
};
</script>

<template>
  <section
    aria-live="polite"
    aria-atomic="true"
    :aria-busy="isLoading ? 'true' : 'false'"
    class="mt-6"
  >
    <div class="flex flex-col gap-5">
      <div
        class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
      >
        <div class="space-y-4">
          <p
            v-if="display.showHeader"
            class="text-[0.6rem] uppercase tracking-[0.32em] text-slate-400 dark:text-slate-500"
          >
            Commander studio
          </p>
          <h2
            v-if="display.showHeader"
            class="font-heading text-3xl text-slate-900 sm:text-4xl dark:text-white"
          >
            {{ stageTitle }}
          </h2>
          <p
            v-if="display.showStatus"
            class="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
            role="status"
          >
            <span
              class="inline-flex items-center rounded-full border border-violet-200/60 bg-violet-100/60 px-2.5 py-0.5 text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:border-violet-400/40 dark:bg-violet-500/10 dark:text-violet-100"
            >
              Status
            </span>
            <span>{{ statusText }}</span>
          </p>
        </div>

        <div
          v-if="display.showChips"
          class="flex flex-wrap justify-start gap-2 sm:justify-end"
        >
          <span
            v-for="chip in summaryChips"
            :key="chip"
            class="rounded-full border border-slate-200/70 bg-white/70 px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
          >
            {{ chip }}
          </span>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <button
          v-if="canRandomizePartner && !isChoiceMode"
          type="button"
          class="rounded-full border border-violet-200 bg-white px-5 py-2 text-xs font-semibold text-violet-700 shadow-sm transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-400/60 dark:bg-slate-900 dark:text-violet-100 dark:hover:bg-slate-800"
          :disabled="isLoading"
          @click="handlePartner"
        >
          {{ partnerButtonLabel }}
        </button>
      </div>
    </div>

    <div class="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div
        class="relative rounded-[2.1rem] border border-slate-200/70 bg-white/85 p-5 shadow-[0_20px_60px_-52px_rgba(15,23,42,0.4)] ring-1 ring-white/40 backdrop-blur sm:p-7 dark:border-slate-700/60 dark:bg-slate-900/70 dark:ring-slate-800/60"
      >
        <div
          class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.08),transparent_60%)] dark:bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.18),transparent_55%)]"
        ></div>
        <div class="relative">
          <div
            v-if="errorMessage"
            class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-800 dark:border-rose-700/40 dark:bg-rose-900/40 dark:text-rose-200"
            role="alert"
          >
            {{ errorMessage }}
          </div>

          <div
            v-else-if="isFirstLoad"
            class="flex min-h-[46vh] flex-col items-center justify-center gap-8 text-center"
          >
            <div class="max-w-lg space-y-3 text-pretty">
              <p
                class="text-sm uppercase tracking-[0.32em] text-violet-600 dark:text-violet-200/80"
              >
                Ready to shuffle
              </p>
              <p
                class="font-heading text-3xl text-slate-900 sm:text-4xl dark:text-white"
              >
                Pull a commander or spark a deck idea.
              </p>
              <p class="text-sm text-slate-500 dark:text-slate-300">
                Tap randomize, or open the options panel to fine tune your pool.
              </p>
            </div>
            <div class="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                class="rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500"
                @click="handleRandomize"
              >
                Randomize
              </button>
              <button
                type="button"
                class="rounded-full border border-slate-200 bg-white px-7 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                @click="handleOptions"
              >
                Options
              </button>
            </div>
          </div>

          <div v-else-if="isChoiceMode" class="grid gap-8 lg:grid-cols-2">
            <section
              v-for="(choice, index) in choices"
              :key="choice.id"
              class="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-xl shadow-slate-900/10 backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p
                    class="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400"
                  >
                    Option {{ index + 1 }}
                  </p>
                  <p class="text-sm text-slate-600 dark:text-slate-300">
                    {{
                      choice.cards.length === 2 ? "Partner-ready" : "Commander"
                    }}
                  </p>
                </div>
                <button
                  v-if="
                    choice.cards.length === 1 &&
                    choice.cards[0] &&
                    canRandomizeChoicePartner(choice.cards[0])
                  "
                  type="button"
                  class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-400/60 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30"
                  :disabled="isLoading"
                  @click="handleChoicePartner(index)"
                >
                  {{ store.getPartnerButtonLabel(choice.cards[0] ?? null) }}
                </button>
              </div>

              <div class="mt-6 grid gap-6">
                <div class="grid gap-6 sm:grid-cols-2">
                  <article
                    v-for="card in choice.cards"
                    :key="card.id"
                    class="group rounded-3xl transition duration-300 hover:-translate-y-1 hover:scale-[1.01]"
                  >
                    <div class="flex flex-col items-center gap-3">
                      <div
                        class="aspect-[63/88] w-full max-w-[17rem] overflow-hidden rounded-3xl bg-slate-100 shadow-[0_16px_36px_-28px_rgba(15,23,42,0.55)] dark:bg-slate-900"
                      >
                        <img
                          v-if="getCardImageUrl(card)"
                          :src="getCardImageUrl(card)"
                          :alt="card.name"
                          class="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div
                          v-else
                          class="flex h-full items-center justify-center text-xs text-slate-400 dark:text-slate-500"
                        >
                          Card image unavailable
                        </div>
                      </div>
                      <div class="text-center">
                        <h3
                          v-if="display.showCardTitles"
                          class="font-heading text-base text-slate-900 dark:text-slate-100"
                        >
                          {{ card.name }}
                        </h3>
                        <p
                          v-if="display.showColorIdentity"
                          class="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-violet-600 dark:text-violet-200"
                        >
                          {{ formatColorIdentity(card.color_identity) }}
                        </p>
                        <div
                          v-if="display.showLinks"
                          class="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold"
                        >
                          <a
                            class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-800 transition hover:bg-violet-100 dark:border-violet-400/60 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30"
                            :href="card.scryfall_uri"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Scryfall
                          </a>
                          <a
                            v-if="store.usesCommanderLink(card)"
                            class="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            :href="getEdhrecCommanderUrl(card)"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            EDHREC commander
                          </a>
                          <a
                            v-else
                            class="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                            :href="getEdhrecCardUrl(card)"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            EDHREC card
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>

                <aside
                  v-if="
                    display.showTags &&
                    mode !== 'spark' &&
                    getTaggableCards(choice.cards).length
                  "
                  class="rounded-2xl border border-slate-200/60 bg-white/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/60"
                >
                  <p
                    class="text-[0.6rem] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
                  >
                    EDHREC tags
                  </p>
                  <div v-if="display.usePairTags && choice.cards.length === 2">
                    <div
                      v-if="
                        getTaggableCards(choice.cards)[0] &&
                        hasTagEntry(
                          getTaggableCards(choice.cards)[0]!,
                          choice.cards,
                        ) &&
                        getTagLabel(
                          getTaggableCards(choice.cards)[0]!,
                          choice.cards,
                        ).length
                      "
                      class="mt-3 flex flex-wrap gap-2"
                    >
                      <a
                        v-for="tag in getTagLabel(
                          getTaggableCards(choice.cards)[0]!,
                          choice.cards,
                        )"
                        :key="tag.href"
                        class="rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-0.5 text-[0.65rem] font-semibold text-violet-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-slate-800"
                        :href="tag.href"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ tag.label }}
                      </a>
                    </div>
                    <p
                      v-else-if="
                        getTaggableCards(choice.cards)[0] &&
                        hasTagEntry(
                          getTaggableCards(choice.cards)[0]!,
                          choice.cards,
                        )
                      "
                      class="mt-2 text-xs text-slate-400 dark:text-slate-500"
                    >
                      No tags yet.
                    </p>
                    <p
                      v-else
                      class="mt-2 text-xs text-slate-400 dark:text-slate-500"
                    >
                      Loading tags...
                    </p>
                  </div>
                  <div v-else class="mt-3 space-y-3">
                    <div
                      v-for="card in getTaggableCards(choice.cards)"
                      :key="card.id"
                      class="rounded-xl border border-slate-200/60 bg-white/85 p-3 dark:border-slate-700/60 dark:bg-slate-900/60"
                    >
                      <p
                        class="text-[0.7rem] font-semibold text-slate-600 dark:text-slate-200"
                      >
                        {{ card.name }}
                      </p>
                      <div
                        v-if="
                          hasTagEntry(card, choice.cards) &&
                          getTagLabel(card, choice.cards).length
                        "
                        class="mt-2 flex flex-wrap gap-2"
                      >
                        <a
                          v-for="tag in getTagLabel(card, choice.cards)"
                          :key="tag.href"
                          class="rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-0.5 text-[0.6rem] font-semibold text-violet-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-slate-800"
                          :href="tag.href"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {{ tag.label }}
                        </a>
                      </div>
                      <p
                        v-else-if="hasTagEntry(card, choice.cards)"
                        class="mt-2 text-xs text-slate-400 dark:text-slate-500"
                      >
                        No tags yet.
                      </p>
                      <p
                        v-else
                        class="mt-2 text-xs text-slate-400 dark:text-slate-500"
                      >
                        Loading tags...
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </section>
          </div>

          <div v-else class="relative">
            <div
              :class="[galleryContainerClass, galleryLayoutClass]"
              role="list"
              aria-label="Random card gallery"
            >
              <article
                v-for="(card, cardIndex) in cards"
                :key="card.id"
                role="listitem"
                class="group relative rounded-3xl transition duration-300 hover:-translate-y-2 hover:scale-[1.01]"
                :class="cardWidthClass(galleryItemCount)"
              >
                <div
                  class="flex flex-col gap-3"
                  :class="
                    showTagPanel(card, cards, cardIndex)
                      ? 'lg:flex-row lg:items-start lg:gap-6'
                      : 'items-center'
                  "
                >
                  <div class="w-full">
                    <div
                      class="aspect-[63/88] w-full overflow-hidden rounded-3xl bg-slate-100 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] dark:bg-slate-900"
                    >
                      <img
                        v-if="getCardImageUrl(card)"
                        :src="getCardImageUrl(card)"
                        :alt="card.name"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div
                        v-else
                        class="flex h-full items-center justify-center text-xs text-slate-400 dark:text-slate-500"
                      >
                        Card image unavailable
                      </div>
                    </div>
                    <div class="p-4 text-center lg:text-left">
                      <h3
                        v-if="display.showCardTitles"
                        class="font-heading text-lg text-slate-900 dark:text-slate-100"
                      >
                        {{ card.name }}
                      </h3>
                      <p
                        v-if="display.showColorIdentity"
                        class="mt-1 text-[0.65rem] uppercase tracking-[0.14em] text-violet-600 dark:text-violet-200"
                      >
                        {{ formatColorIdentity(card.color_identity) }}
                      </p>
                      <div
                        v-if="display.showLinks"
                        class="mt-3 flex flex-wrap justify-center gap-2 text-xs font-semibold"
                        :class="
                          showTagPanel(card, cards, cardIndex)
                            ? 'lg:justify-start'
                            : ''
                        "
                      >
                        <a
                          class="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-800 transition hover:bg-violet-100 dark:border-violet-400/60 dark:bg-violet-500/20 dark:text-violet-100 dark:hover:bg-violet-500/30"
                          :href="card.scryfall_uri"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Scryfall
                        </a>
                        <a
                          v-if="store.usesCommanderLink(card)"
                          class="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          :href="getEdhrecCommanderUrl(card)"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          EDHREC commander
                        </a>
                        <a
                          v-else
                          class="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                          :href="getEdhrecCardUrl(card)"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          EDHREC card
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </article>
              <article
                v-if="showTagCard"
                role="listitem"
                class="group relative rounded-3xl"
                :class="cardWidthClass(galleryItemCount)"
              >
                <div class="h-full rounded-3xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/70">
                  <p class="text-[0.6rem] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    EDHREC tags
                  </p>
                  <div v-if="display.usePairTags && cards.length === 2" class="mt-4">
                    <div
                      v-if="primaryTagCard && hasTagEntry(primaryTagCard, cards) && getTagLabel(primaryTagCard, cards).length"
                      class="flex flex-wrap gap-2"
                    >
                      <a
                        v-for="tag in getTagLabel(primaryTagCard, cards)"
                        :key="tag.href"
                        class="rounded-full border border-slate-200/70 bg-slate-50/80 px-2.5 py-0.5 text-[0.65rem] font-semibold text-violet-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-slate-800"
                        :href="tag.href"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ tag.label }}
                      </a>
                    </div>
                    <p
                      v-else-if="primaryTagCard && hasTagEntry(primaryTagCard, cards)"
                      class="mt-2 text-xs text-slate-400 dark:text-slate-500"
                    >
                      No tags yet.
                    </p>
                    <p v-else class="mt-2 text-xs text-slate-400 dark:text-slate-500">
                      Loading tags...
                    </p>
                  </div>
                  <div v-else class="mt-4 space-y-3">
                    <div
                      v-for="card in getTaggableCards(cards)"
                      :key="card.id"
                      class="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/60 dark:bg-slate-900/60"
                    >
                      <p class="text-[0.7rem] font-semibold text-slate-600 dark:text-slate-200">
                        {{ card.name }}
                      </p>
                      <div
                        v-if="hasTagEntry(card, cards) && getTagLabel(card, cards).length"
                        class="mt-2 flex flex-wrap gap-2"
                      >
                        <a
                          v-for="tag in getTagLabel(card, cards)"
                          :key="tag.href"
                          class="rounded-full border border-slate-200/70 bg-white/80 px-2.5 py-0.5 text-[0.6rem] font-semibold text-violet-600 transition hover:bg-slate-100 dark:border-slate-700/60 dark:bg-slate-900 dark:text-violet-200 dark:hover:bg-slate-800"
                          :href="tag.href"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {{ tag.label }}
                        </a>
                      </div>
                      <p v-else-if="hasTagEntry(card, cards)" class="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        No tags yet.
                      </p>
                      <p v-else class="mt-2 text-xs text-slate-400 dark:text-slate-500">
                        Loading tags...
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>
            <div v-if="showPartnerLink" class="mt-4 flex justify-center">
              <a
                class="rounded-full border border-slate-200 bg-white px-4 py-1 text-[0.65rem] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                :href="partnerLinkUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                EDHREC partners
              </a>
            </div>
          </div>
        </div>
      </div>
      <aside class="hidden lg:block">
        <div class="sticky top-24 space-y-4">
          <div
            class="rounded-2xl border border-slate-200/60 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60"
          >
            <p
              class="text-[0.6rem] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            >
              Mode
            </p>
            <div class="mt-3 grid gap-2">
              <button
                v-for="item in modes"
                :key="item.id"
                type="button"
                class="rounded-xl border px-3 py-2 text-left text-[0.6rem] font-semibold uppercase tracking-[0.18em] transition"
                :class="
                  mode === item.id
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-800 dark:text-violet-100'
                    : 'border-slate-200/70 bg-white/80 text-slate-500 hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800'
                "
                @click="setMode(item.id)"
              >
                {{ item.label }}
              </button>
            </div>
          </div>

          <div
            class="rounded-2xl border border-slate-200/60 bg-white/70 p-3 shadow-sm backdrop-blur dark:border-slate-700/60 dark:bg-slate-900/60"
          >
            <p
              class="text-[0.6rem] uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
            >
              Colors
            </p>
            <p
              class="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-200"
            >
              {{ colorFilterLabel }}
            </p>
            <button
              type="button"
              class="mt-3 w-full rounded-full border border-slate-200/70 bg-white/80 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-800"
              @click="handleOptions"
            >
              Edit filters
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
