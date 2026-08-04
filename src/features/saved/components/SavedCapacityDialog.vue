<script setup lang="ts">
import ConfirmationDialog from "../../../components/layout/ConfirmationDialog.vue";
import { MAX_SAVED } from "../../../stores/randomander";

defineProps<{
  targetLabel: string;
  oldestLabel: string;
}>();

defineEmits<{
  (event: "cancel"): void;
  (event: "confirm"): void;
}>();
</script>

<template>
  <ConfirmationDialog
    title="Saved pulls is full"
    :description="`Saved holds ${MAX_SAVED} pulls. Saving ${targetLabel} will permanently remove the oldest saved pull, ${oldestLabel}.`"
    confirm-label="Replace oldest"
    danger
    @cancel="$emit('cancel')"
    @confirm="$emit('confirm')"
  />
</template>
