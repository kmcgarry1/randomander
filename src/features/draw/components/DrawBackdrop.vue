<script setup lang="ts">
import { computed } from "vue";
import type { PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getCardArtUrl } from "../../../lib/scryfall";

const props = defineProps({
  cards: { type: Array as PropType<ScryfallCard[]>, required: true },
  simplified: { type: Boolean, default: false },
});

const accentPositions = [
  "left-[-8%] top-[2%]",
  "right-[-10%] top-[18%]",
  "left-[6%] bottom-[-10%]",
] as const;

const uniqueCards = computed(() =>
  Array.from(new Map(props.cards.map((card) => [card.id, card])).values())
    .slice(0, 5),
);

const artEntries = computed(() =>
  uniqueCards.value
    .map((card) => {
      const imageUrl = getCardArtUrl(card);
      if (!imageUrl) return null;
      return {
        id: card.id,
        imageUrl,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
);

const featureArt = computed(() => {
  if (artEntries.value.length === 0) return null;
  const seed = artEntries.value.reduce((total, entry, index) => {
    const charTotal = entry.id
      .split("")
      .reduce((inner, char) => inner + char.charCodeAt(0), 0);
    return total + charTotal + index * 17;
  }, 0);
  return artEntries.value[seed % artEntries.value.length] ?? artEntries.value[0] ?? null;
});

const accentArts = computed(() =>
  (props.simplified ? [] : artEntries.value)
    .filter((entry) => entry.id !== featureArt.value?.id)
    .slice(0, 3)
    .map((entry, index) => ({
      ...entry,
      positionClass:
        accentPositions[index] ?? accentPositions[index % accentPositions.length],
      sizeClass:
        index === 0
          ? "h-[24rem] w-[24rem] sm:h-[30rem] sm:w-[30rem]"
          : index === 1
            ? "h-[22rem] w-[22rem] sm:h-[28rem] sm:w-[28rem]"
            : "h-[18rem] w-[18rem] sm:h-[22rem] sm:w-[22rem]",
      opacityClass:
        index === 0
          ? "opacity-[0.26]"
          : index === 1
            ? "opacity-[0.22]"
            : "opacity-[0.18]",
    })),
);

const featureArtClass = computed(() =>
  props.simplified
    ? "absolute inset-[-3%] scale-[1.02] bg-cover bg-center opacity-[0.42] blur-[12px] saturate-[1.02] dark:opacity-[0.34]"
    : "motion-backdrop absolute inset-[-6%] scale-[1.08] bg-cover bg-center opacity-[0.58] blur-[18px] saturate-[1.15] dark:opacity-[0.46]",
);
</script>

<template>
  <div
    v-if="featureArt || accentArts.length"
    data-testid="draw-backdrop"
    :data-mode="props.simplified ? 'simplified' : 'full'"
    class="pointer-events-none absolute inset-[-2.5rem] overflow-hidden rounded-[3.25rem]"
    aria-hidden="true"
  >
    <div
      v-if="featureArt && props.simplified"
      class="absolute inset-0"
    >
      <div
        :class="featureArtClass"
        :style="{ backgroundImage: `url(${featureArt.imageUrl})` }"
      ></div>
    </div>

    <Transition
      v-else
      name="backdrop-fade"
      mode="out-in"
    >
      <div
        v-if="featureArt"
        :key="featureArt.id"
        class="absolute inset-0"
      >
        <div
          :class="featureArtClass"
          :style="{ backgroundImage: `url(${featureArt.imageUrl})` }"
        ></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.2),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_28%)]"
        ></div>
      </div>
    </Transition>

    <TransitionGroup
      v-if="!props.simplified"
      name="backdrop-fade"
      tag="div"
      class="absolute inset-0"
    >
      <div
        v-for="accent in accentArts"
        :key="accent.id"
        class="motion-ambient absolute rounded-full blur-[90px] saturate-[1.18]"
        :class="[accent.positionClass, accent.sizeClass, accent.opacityClass]"
        :style="{ backgroundImage: `url(${accent.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }"
      ></div>
    </TransitionGroup>

    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(255,244,214,0.18),transparent_24%)] dark:bg-[radial-gradient(circle_at_18%_22%,rgba(255,255,255,0.06),transparent_24%)]"
    ></div>
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.14),rgba(15,23,42,0.34))] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.56))]"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_82%_14%,rgba(56,189,248,0.16),transparent_28%)] dark:bg-[radial-gradient(circle_at_82%_14%,rgba(56,189,248,0.12),transparent_28%)]"
    ></div>
    <div
      class="absolute inset-0 bg-[radial-gradient(circle_at_50%_62%,rgba(30,41,59,0.08),transparent_26%)] dark:bg-[radial-gradient(circle_at_50%_62%,rgba(255,255,255,0.04),transparent_24%)]"
    ></div>
    <div
      class="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-white/0 to-[#f4f1ec]/68 dark:from-slate-950/[0.08] dark:via-slate-950/[0.14] dark:to-slate-950/74"
    ></div>
    <div
      class="absolute inset-0 shadow-[inset_0_0_120px_rgba(15,23,42,0.24)] dark:shadow-[inset_0_0_160px_rgba(2,6,23,0.6)]"
    ></div>
  </div>
</template>
