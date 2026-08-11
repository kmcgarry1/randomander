<script setup lang="ts">
import { computed, type PropType } from "vue";
import type { ScryfallCard } from "../../../lib/scryfall";
import { getTypeLine } from "../../../lib/scryfall";

type TextFace = {
  key: string;
  name: string;
  typeLine: string;
  oracleText: string;
};

const props = defineProps({
  card: { type: Object as PropType<ScryfallCard>, required: true },
  showIdentity: { type: Boolean, default: true },
});

const textFaces = computed<TextFace[]>(() => {
  if (props.card.card_faces?.length) {
    const nameParts = props.card.name.split(/\s*\/\/\s*/);
    return props.card.card_faces.map((face, index) => ({
      key: `${props.card.id}-text-face-${index}`,
      name:
        face.name?.trim() ||
        nameParts[index]?.trim() ||
        (index === 0 ? props.card.name : `Face ${index + 1}`),
      typeLine:
        face.type_line?.trim() ||
        (index === 0 ? props.card.type_line?.trim() : "") ||
        "Type line unavailable.",
      oracleText: face.oracle_text?.trim() ?? "",
    }));
  }

  return [
    {
      key: `${props.card.id}-text-face-0`,
      name: props.card.name,
      typeLine: getTypeLine(props.card).trim() || "Type line unavailable.",
      oracleText: props.card.oracle_text?.trim() ?? "",
    },
  ];
});
</script>

<template>
  <section
    class="min-w-0 max-w-full rounded-2xl border border-[var(--md-sys-color-outline-variant)] bg-[var(--md-sys-color-surface-container-lowest)] p-3"
    :aria-label="`Card text for ${card.name}`"
  >
    <p class="m3-label">CARD TEXT</p>
    <div class="mt-2 min-w-0 max-w-full space-y-3">
      <article
        v-for="face in textFaces"
        :key="face.key"
        class="min-w-0 max-w-full space-y-1"
      >
        <h4 v-if="showIdentity" class="max-w-full break-words text-sm font-bold leading-5 [overflow-wrap:anywhere]">
          {{ face.name }}
        </h4>
        <p
          v-if="showIdentity"
          class="max-w-full break-words text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)] [overflow-wrap:anywhere]"
        >
          {{ face.typeLine }}
        </p>
        <p class="max-w-full whitespace-pre-line break-words text-sm leading-6 [overflow-wrap:anywhere]">
          <span class="sr-only">Oracle text: </span>
          <span v-if="face.oracleText">{{ face.oracleText }}</span>
          <span v-else class="italic text-[var(--md-sys-color-on-surface-variant)]">
            No oracle text.
          </span>
        </p>
      </article>
    </div>
  </section>
</template>
