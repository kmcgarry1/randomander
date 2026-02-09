<script setup lang="ts">
import type { PropType } from "vue";
import type { PartnerKind, ScryfallCard } from "../../../lib/scryfall";
import {
  formatColorIdentity,
  getCardImageUrl,
  getEdhrecCommanderUrl,
  getTypeLine,
} from "../../../lib/scryfall";
import type { CommanderChoice } from "../../../stores/randomander";
import { useRandomanderStore } from "../../../stores/randomander";
import ChoiceOptionsSection from "./ChoiceOptionsSection.vue";
import { computed } from "vue";

const props = defineProps({
  heroCards: { type: Array as PropType<ScryfallCard[]>, required: true },
  heroGroup: { type: Array as PropType<ScryfallCard[]>, required: true },
  heroHasCompanionSlot: { type: Boolean, required: true },
  heroPartnerKind: {
    type: String as PropType<PartnerKind | null>,
    default: null,
  },
  heroCompanionButtonLabel: { type: String, required: true },
  heroBackgroundStyle: {
    type: Object as PropType<Record<string, string>>,
    required: true,
  },
  heroHeadline: { type: String, required: true },
  statusText: { type: String, required: true },
  heroPartnerLinkUrl: {
    type: String as PropType<string | null>,
    default: null,
  },
  heroIsBackground: { type: Boolean, required: true },
  canRandomizePartner: { type: Boolean, required: true },
  partnerButtonLabel: { type: String, required: true },
  isLoading: { type: Boolean, required: true },
  heroCard: { type: Object as PropType<ScryfallCard | null>, default: null },
  choices: { type: Array as PropType<CommanderChoice[]>, required: true },
  isChoiceMode: { type: Boolean, required: true },
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
  onPartner: { type: Function as PropType<() => void>, required: true },
  onHeroCompanion: { type: Function as PropType<() => void>, required: true },
  onCommanderForBackground: {
    type: Function as PropType<() => void>,
    required: true,
  },
});

const store = useRandomanderStore();

// Helper function to get deck count for a card, avoiding double lookups
const getDeckCount = (card: ScryfallCard) => {
  if (!store.shouldShowTags(card)) return null;
  return store.getDeckCountForCard(card, props.heroGroup);
};

const formatCommanderLine = (card: ScryfallCard, prefix: string) => {
  const setCode = card.set ? card.set.toUpperCase() : "";
  const number = card.collector_number ?? "";
  const parts = [prefix, card.name];
  if (setCode) parts.push(`(${setCode})`);
  if (number) parts.push(number);
  return parts.join(" ").trim();
};

const buildMultisearchUrl = (format: "archidekt" | "moxfield", line: string) =>
  `https://www.tcg.land/multisearch#/magic-the-gathering?format=${format}&separator=%7C&lines=${encodeURIComponent(
    line,
  )}`;

const archidektCommanderLink = computed(() => {
  if (!props.heroCard) return null;
  const line = formatCommanderLine(props.heroCard, "1x");
  return buildMultisearchUrl("archidekt", line);
});

const moxfieldCommanderLink = computed(() => {
  if (!props.heroCard) return null;
  const line = formatCommanderLine(props.heroCard, "1");
  return buildMultisearchUrl("moxfield", line);
});
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-[min(92vw,1200px)] flex-col items-center gap-5 rounded-[3rem] border border-white/10 bg-gradient-to-b from-slate-950/90 to-slate-900/60 px-6 py-8 text-center text-slate-100 shadow-[0_35px_60px_-45px_rgba(2,4,16,0.85)] backdrop-blur"
  >
    <div
      class="relative flex min-h-[420px] w-full flex-col items-center justify-between overflow-hidden rounded-[2.5rem] border border-dashed border-slate-700/70"
    >
      <div
        v-if="heroBackgroundStyle.backgroundImage"
        class="absolute inset-0 opacity-30"
        :style="heroBackgroundStyle"
      ></div>
      <div
        class="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/10 to-slate-950/90"
      ></div>
      <div
        class="relative z-10 flex w-full flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <p class="text-[0.65rem] uppercase tracking-[0.4em] text-slate-400">
          Commander studio
        </p>
        <h2 class="text-3xl font-semibold tracking-tight text-white">
          {{ heroHeadline }}
        </h2>
        <p class="text-sm tracking-tight text-slate-300">
          {{ statusText }}
        </p>
        <p class="max-w-md text-sm leading-relaxed text-slate-300">
          Keep this commander as the anchor or tap the companion/partner buttons
          below to refresh the missing half of the pair.
        </p>
        <div
          role="list"
          class="flex flex-wrap items-center justify-center gap-6 py-2"
        >
          <article
            v-for="card in heroCards"
            :key="card.id"
            class="aspect-[63/88] w-[260px] overflow-hidden rounded-[1.4rem] border border-white/20 bg-slate-900/80 shadow-[0_15px_45px_-20px_rgba(0,0,0,0.8)]"
            role="listitem"
          >
            <img
              :src="getCardImageUrl(card)"
              :alt="card.name"
              class="h-full w-full object-cover"
            />
          </article>
          <article
            v-if="heroHasCompanionSlot"
            class="flex min-w-[16rem] flex-col justify-between gap-4 rounded-2xl border border-dashed border-white/30 bg-slate-900/40 p-4 text-left text-slate-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
          >
            <div class="space-y-2">
              <p
                class="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400"
              >
                Companion needed
              </p>
              <p class="text-sm font-semibold text-white">
                {{
                  heroPartnerKind === "choose_background"
                    ? "Choose a background"
                    : "Partner pairing"
                }}
              </p>
              <p
                class="text-[0.65rem] uppercase tracking-[0.2em] text-slate-400"
              >
                Tap below to reveal the missing card.
              </p>
              <p class="text-[0.6rem] leading-relaxed text-slate-300">
                Companion suggestions always respect the commander’s color
                identity and archetype focus.
              </p>
            </div>
            <button
              type="button"
              class="w-full rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-[0.65rem] font-semibold tracking-tight text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
              @click="onHeroCompanion"
              :disabled="isLoading"
            >
              {{ heroCompanionButtonLabel }}
            </button>
          </article>
        </div>
        <section
          class="mt-6 w-full rounded-[2rem] border border-white/10 bg-slate-900/70 px-5 py-5 text-left text-slate-100 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.75)] backdrop-blur"
          :class="{
            'lg:max-w-none': heroGroup.length === 1 && !heroHasCompanionSlot,
          }"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p class="text-[0.6rem] uppercase tracking-[0.4em] text-slate-400">
              Details
            </p>
            <div class="flex items-center gap-3">
              <p class="text-[0.6rem] tracking-tight text-slate-300">
                {{ heroGroup.length }} card{{
                  heroGroup.length === 1 ? "" : "s"
                }}
              </p>
              <button
                v-if="canRandomizePartner && heroCard"
                type="button"
                class="rounded-full border border-amber-300 bg-amber-400 px-4 py-1 text-[0.6rem] font-semibold tracking-tight text-slate-900 transition hover:bg-amber-300 disabled:opacity-60"
                @click="onPartner"
                :disabled="isLoading"
              >
                {{ partnerButtonLabel }}
              </button>
              <button
                v-if="heroIsBackground"
                type="button"
                class="rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[0.6rem] font-semibold tracking-tight text-white transition hover:bg-white/20 disabled:opacity-60"
                @click="onCommanderForBackground"
                :disabled="isLoading"
              >
                Find commander
              </button>
            </div>
          </div>
          <p class="mt-2 text-sm text-slate-300">
            Randomize partners and companions as needed to keep the current draw
            balanced and ready for deckbuilding.
          </p>
          <div
            class="mt-4 grid gap-4 md:flex md:flex-wrap md:overflow-x-auto md:pb-2"
          >
            <article
              v-for="card in heroCards"
              :key="card.id"
              class="flex w-full flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] md:min-w-[16rem]"
            >
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    class="text-sm font-semibold tracking-tight text-slate-100"
                  >
                    {{ card.name }}
                  </p>
                  <p class="text-[0.65rem] text-slate-400">
                    {{ getTypeLine(card) }}
                  </p>
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-[0.65rem] text-slate-400">
                  {{ formatColorIdentity(card.color_identity) }}
                </p>
                <p
                  v-if="getDeckCount(card) != null"
                  class="text-[0.65rem] text-slate-400"
                >
                  {{ getDeckCount(card)?.toLocaleString() }}
                  EDHREC decks
                </p>
              </div>
              <div
                v-if="store.shouldShowTags(card)"
                class="mt-2 flex w-full flex-wrap items-center gap-2 overflow-x-auto"
              >
                <p
                  v-if="
                    store.shouldRenderTagPanel(card) &&
                    !store.hasTagEntry(card, heroGroup)
                  "
                  class="text-[0.65rem] tracking-tight text-slate-400"
                >
                  Loading tags...
                </p>
                <p
                  v-else-if="
                    store.hasTagEntry(card, heroGroup) &&
                    store.getTagsForCard(card, heroGroup).length === 0
                  "
                  class="text-[0.65rem] tracking-tight text-slate-400"
                >
                  No tags yet
                </p>
                <a
                  v-for="tag in store.getTagsForCard(card, heroGroup)"
                  :key="tag.href"
                  :href="tag.href"
                  target="_blank"
                  rel="noreferrer"
                  class="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-white/60"
                >
                  {{ tag.label }}
                  <span
                    v-if="tag.count"
                    class="ml-1 text-[0.55rem] text-slate-400"
                  >
                    ({{ tag.count.toLocaleString() }})
                  </span>
                </a>
              </div>
            </article>
          </div>
          <div
            class="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3"
          >
            <a
              v-if="heroCard"
              :href="heroCard.scryfall_uri"
              target="_blank"
              rel="noreferrer"
              class="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
            >
              Scryfall page
            </a>
            <a
              v-if="heroCard"
              :href="getEdhrecCommanderUrl(heroCard)"
              target="_blank"
              rel="noreferrer"
              class="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
            >
              EDHREC commander
            </a>
            <a
              v-if="heroGroup.length === 2 && heroPartnerLinkUrl"
              :href="heroPartnerLinkUrl"
              target="_blank"
              rel="noreferrer"
              class="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-white/20"
            >
              EDHREC partners
            </a>
          </div>
          <p class="mt-2 text-[0.6rem] text-slate-300">
            Launch Archidekt or Moxfield via TCG Land Multisearch with this
            commander as the deck’s lead.
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-3">
            <a
              v-if="archidektCommanderLink"
              :href="archidektCommanderLink"
              target="_blank"
              rel="noreferrer"
              class="rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-[0.65rem] font-semibold tracking-tight text-slate-900 transition hover:bg-amber-300"
            >
              Build on Archidekt
            </a>
            <a
              v-if="moxfieldCommanderLink"
              :href="moxfieldCommanderLink"
              target="_blank"
              rel="noreferrer"
              class="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[0.65rem] font-semibold tracking-tight text-white transition hover:bg-white/20"
            >
              Build on Moxfield
            </a>
          </div>
        </section>
        <ChoiceOptionsSection
          v-if="isChoiceMode && choices.length"
          :choices="choices"
          :is-loading="isLoading"
          :can-randomize-choice-partner="canRandomizeChoicePartner"
          :on-choice-partner="onChoicePartner"
          :get-partner-button-label="getPartnerButtonLabel"
        />
      </div>
    </div>
  </div>
</template>
