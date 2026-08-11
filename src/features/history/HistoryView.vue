<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  CheckIcon,
  ClockIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import {
  MAX_HISTORY,
  MAX_SAVED,
  useRandomanderStore,
  modes,
} from "../../stores/randomander";
import { getCardThumbnailUrl } from "../../lib/scryfall";
import type { PullRecord } from "../../stores/randomander";
import ManaIdentity from "../../components/mtg/ManaIdentity.vue";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog.vue";
import SavedCapacityDialog from "../saved/components/SavedCapacityDialog.vue";

const props = withDefaults(
  defineProps<{
    panel?: boolean;
  }>(),
  {
    panel: false,
  },
);

const store = useRandomanderStore();
const { history, saved } = storeToRefs(store);
const clearDialogOpen = ref(false);
const clearCount = ref(0);
const pendingSave = ref<PullRecord | null>(null);
const announcement = ref("");
const closeButtonRef = ref<HTMLButtonElement | null>(null);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const getModeLabel = (mode: PullRecord["mode"]) =>
  modes.find((item) => item.id === mode)?.label ?? "Commander";

const buildSummary = (record: PullRecord) => {
  const chips: string[] = [];
  if (
    record.options.selectedColors.length === 0 &&
    record.options.colorCount !== "any"
  ) {
    chips.push(`Colors: ${record.options.colorCount}`);
  }
  if (record.mode === "spark" && record.options.excludeGameChangers) {
    chips.push("No Game Changers");
  }
  if (record.options.useRankCutoff) {
    chips.push("Skip top 10%");
  }
  if (record.options.limitByDecks && !record.options.useRankCutoff) {
    chips.push(`Decks < ${record.options.maxDecks}`);
  }
  return chips;
};

const getGroups = (record: PullRecord) =>
  record.choices?.length
    ? record.choices.map((choice) => choice.cards)
    : [record.cards];

const getGroupLabel = (cards: PullRecord["cards"]) =>
  cards.map((card) => card.name).join(" + ");

const getRecordLabel = (record: PullRecord) =>
  getGroups(record).map(getGroupLabel).join(" or ");

const oldestSavedLabel = computed(() => {
  const oldest = saved.value[saved.value.length - 1];
  return oldest ? getRecordLabel(oldest) : "the oldest saved pull";
});

const isRecordSaved = (record: PullRecord) => store.isRecordSaved(record);

const handleClose = () => {
  if (props.panel) {
    store.closePanel();
    return;
  }
  store.view = "draw";
};

const goToDraw = async () => {
  handleClose();
  await nextTick();
  document.getElementById("draw-randomize")?.focus({ preventScroll: true });
};

const handleLoad = (record: PullRecord) => {
  store.loadRecord(record);
};

const announce = async (message: string) => {
  announcement.value = "";
  await nextTick();
  announcement.value = message;
};

const handleSave = async (record: PullRecord) => {
  if (saved.value.length >= MAX_SAVED) {
    pendingSave.value = record;
    return;
  }
  if (store.saveRecord(record)) {
    await announce(`Saved ${getRecordLabel(record)}.`);
  }
};

const requestClear = () => {
  if (!history.value.length) return;
  clearCount.value = history.value.length;
  clearDialogOpen.value = true;
};

const confirmClear = async () => {
  const count = clearCount.value;
  const didClear = store.clearHistory();
  clearDialogOpen.value = false;
  if (!didClear) return;
  await announce(`Cleared ${count} history pull${count === 1 ? "" : "s"}.`);
  await nextTick();
  closeButtonRef.value?.focus({ preventScroll: true });
};

const confirmCapacitySave = async () => {
  const record = pendingSave.value;
  if (!record) return;
  const replacedLabel = oldestSavedLabel.value;
  const didSave = store.saveRecord(record, { replaceOldest: true });
  pendingSave.value = null;
  if (!didSave) return;
  await announce(
    `Saved ${getRecordLabel(record)} and removed the oldest saved pull, ${replacedLabel}.`,
  );
  await nextTick();
  closeButtonRef.value?.focus({ preventScroll: true });
};
</script>

<template>
  <section
    :class="['mx-auto max-w-6xl space-y-6', props.panel ? '' : 'mt-6']"
  >
    <header class="flex flex-wrap items-start gap-3 px-1 sm:gap-4">
      <div
        class="hidden h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] sm:flex"
        aria-hidden="true"
      >
        <ClockIcon class="h-6 w-6" />
      </div>

      <div class="min-w-0 flex-1">
        <h2
          class="text-[1.75rem] font-medium leading-tight text-[var(--md-sys-color-on-surface)] sm:text-3xl"
        >
          History
        </h2>
        <div class="m3-chip mt-3 w-fit" aria-label="History entry count">
          <ClockIcon class="h-4 w-4" aria-hidden="true" />
          <span>{{ history.length }} pull{{ history.length === 1 ? "" : "s" }}</span>
        </div>
        <p class="mt-2 text-xs leading-5 text-[var(--md-sys-color-on-surface-variant)]">
          History keeps the {{ MAX_HISTORY }} most recent pulls. Older pulls are
          removed automatically.
        </p>
      </div>

      <div class="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
        <button
          type="button"
          class="m3-button m3-button--text max-w-full whitespace-normal px-3 text-center text-[var(--md-sys-color-error)]"
          :disabled="history.length === 0"
          :aria-label="
            history.length
              ? `Clear all ${history.length} history pull${history.length === 1 ? '' : 's'}`
              : 'Clear history (empty)'
          "
          @click="requestClear"
        >
          <TrashIcon class="h-5 w-5" aria-hidden="true" />
          Clear history
        </button>
        <button
          ref="closeButtonRef"
          type="button"
          class="m3-icon-button"
          :aria-label="props.panel ? 'Close' : 'Back to draw'"
          @click="handleClose"
        >
          <XMarkIcon v-if="props.panel" class="h-6 w-6" aria-hidden="true" />
          <ArrowLeftIcon v-else class="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </header>

    <p class="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <section
      v-if="history.length === 0"
      class="m3-card flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center"
      aria-labelledby="empty-history-title"
    >
      <div
        class="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)]"
        aria-hidden="true"
      >
        <ClockIcon class="h-8 w-8" />
      </div>
      <h3
        id="empty-history-title"
        class="mt-5 text-xl font-medium text-[var(--md-sys-color-on-surface)]"
      >
        No pulls yet.
      </h3>
      <p
        class="mt-2 max-w-sm text-sm leading-6 text-[var(--md-sys-color-on-surface-variant)]"
      >
        Draw a commander or spark to start your history.
      </p>
      <button
        type="button"
        class="m3-button m3-button--filled mt-5"
        @click="goToDraw"
      >
        Start a draw
        <ArrowRightIcon class="h-5 w-5" aria-hidden="true" />
      </button>
    </section>

    <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4" role="list">
      <article
        v-for="record in history"
        :key="record.id"
        class="m3-card flex min-w-0 flex-col p-4 sm:p-5"
        role="listitem"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h3
              class="text-lg font-medium leading-6 text-[var(--md-sys-color-on-surface)]"
            >
              {{ getModeLabel(record.mode) }}
            </h3>
            <time
              :datetime="record.createdAt"
              class="mt-1 block text-xs text-[var(--md-sys-color-on-surface-variant)]"
            >
              {{ formatDate(record.createdAt) }}
            </time>
          </div>
          <span v-if="record.choices?.length" class="m3-chip shrink-0">
            {{ record.choices.length }} options
          </span>
        </div>

        <div class="mt-4 grid gap-2.5">
          <div
            v-for="(group, index) in getGroups(record)"
            :key="`${record.id}-${index}`"
            class="flex min-w-0 items-center gap-4 rounded-[1.25rem] bg-[var(--md-sys-color-surface-container)] p-3"
          >
            <div class="flex shrink-0 -space-x-5" role="group">
              <img
                v-for="card in group"
                :key="card.id"
                :src="getCardThumbnailUrl(card)"
                :alt="card.name"
                class="h-20 w-[3.6rem] rounded-[0.65rem] border-2 border-[var(--md-sys-color-surface-container)] bg-black object-contain shadow-sm sm:h-24 sm:w-[4.3rem]"
                loading="lazy"
              />
            </div>
            <div class="min-w-0 flex-1">
              <p
                v-if="record.choices?.length"
                class="m3-label text-[var(--md-sys-color-primary)]"
              >
                Option {{ index + 1 }}
              </p>
              <p
                class="mt-1 line-clamp-2 text-sm font-medium leading-5 text-[var(--md-sys-color-on-surface)]"
              >
                {{ getGroupLabel(group) }}
              </p>
            </div>
          </div>
        </div>

        <div
          v-if="record.options.selectedColors.length || buildSummary(record).length"
          class="mt-4 flex flex-wrap items-center gap-2"
          aria-label="Pull filters"
        >
          <ManaIdentity
            v-if="record.options.selectedColors.length"
            class="m3-chip"
            :colors="record.options.selectedColors"
            compact
          />
          <span v-for="chip in buildSummary(record)" :key="chip" class="m3-chip">
            {{ chip }}
          </span>
        </div>

        <div
          class="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--md-sys-color-outline-variant)] pt-4"
        >
          <button
            type="button"
            class="m3-button m3-button--tonal"
            :disabled="isRecordSaved(record)"
            @click="handleSave(record)"
          >
            <CheckIcon
              v-if="isRecordSaved(record)"
              class="h-5 w-5"
              aria-hidden="true"
            />
            <BookmarkIcon v-else class="h-5 w-5" aria-hidden="true" />
            {{ isRecordSaved(record) ? "Saved" : "Save" }}
          </button>
          <button
            type="button"
            class="m3-button m3-button--filled"
            @click="handleLoad(record)"
          >
            Load
            <ArrowRightIcon class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>

    <ConfirmationDialog
      v-if="clearDialogOpen"
      :title="`Clear ${clearCount} history pull${clearCount === 1 ? '' : 's'}?`"
      :description="`This will permanently remove ${clearCount} history pull${clearCount === 1 ? '' : 's'} from this device.`"
      :confirm-label="`Clear ${clearCount} pull${clearCount === 1 ? '' : 's'}`"
      danger
      @cancel="clearDialogOpen = false"
      @confirm="confirmClear"
    />
    <SavedCapacityDialog
      v-if="pendingSave"
      :target-label="getRecordLabel(pendingSave)"
      :oldest-label="oldestSavedLabel"
      @cancel="pendingSave = null"
      @confirm="confirmCapacitySave"
    />
  </section>
</template>
