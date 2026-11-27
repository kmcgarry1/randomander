<script setup lang="ts">
import { computed } from "vue";
import {
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/vue/24/outline";
import type { AppError } from "../../../lib/appError";
import {
  getErrorMessage,
  getApplicableRecoveryActions,
  type RecoveryHint,
} from "../../../lib/errorMessages";

interface Props {
  error: AppError | null;
  isRecovering?: boolean;
  successMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isRecovering: false,
  successMessage: "",
});

const emit = defineEmits<{
  "recovery-action": [hint: RecoveryHint];
  dismiss: [];
}>();

const isVisible = computed(() => !!props.error || !!props.successMessage);
const errorMessage = computed(() =>
  props.error ? getErrorMessage(props.error) : null,
);
const recoveryActions = computed(() =>
  props.error ? getApplicableRecoveryActions(props.error) : [],
);

const handleRecoveryAction = (hint: RecoveryHint) => {
  emit("recovery-action", hint);
};

const handleDismiss = () => {
  emit("dismiss");
};
</script>

<template>
  <Transition name="error-slide">
    <div
      v-show="isVisible"
      class="relative mx-auto w-full min-w-0 max-w-[100rem] px-3 py-3 sm:px-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <!-- Error State -->
      <div
        v-if="error && errorMessage && !successMessage"
        class="m3-card m3-card--filled gap-3 flex items-start gap-3 rounded-lg bg-[var(--md-sys-color-error-container)] p-4 sm:gap-4 sm:p-5"
      >
        <ExclamationTriangleIcon
          class="mt-0.5 h-5 w-5 shrink-0 text-[var(--md-sys-color-on-error-container)]"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <h3 class="text-sm font-semibold text-[var(--md-sys-color-on-error-container)]">
            {{ errorMessage.title }}
          </h3>
          <p class="mt-1 text-sm leading-5 text-[var(--md-sys-color-on-error-container)] opacity-90">
            {{ errorMessage.description }}
          </p>
          <p class="mt-2 text-xs leading-4 text-[var(--md-sys-color-on-error-container)] opacity-75">
            {{ errorMessage.userHint }}
          </p>
          <!-- Recovery Actions -->
          <div
            v-if="recoveryActions.length > 0"
            class="mt-4 flex flex-wrap gap-2"
          >
            <button
              v-for="action in recoveryActions"
              :key="action.hint"
              type="button"
              :disabled="isRecovering"
              :title="action.description"
              class="m3-button m3-button--filled text-xs sm:text-sm"
              @click="handleRecoveryAction(action.hint)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <button
          type="button"
          :disabled="isRecovering"
          class="m3-icon-button m3-icon-button--standard shrink-0"
          aria-label="Dismiss error"
          @click="handleDismiss"
        >
          <XMarkIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <!-- Success State -->
      <div
        v-else-if="successMessage"
        class="flex items-start gap-3 rounded-lg bg-[var(--md-sys-color-primary-container)] p-4 sm:gap-4 sm:p-5"
      >
        <CheckIcon
          class="mt-0.5 h-5 w-5 shrink-0 text-[var(--md-sys-color-on-primary-container)]"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p class="text-sm text-[var(--md-sys-color-on-primary-container)]">
            {{ successMessage }}
          </p>
        </div>
        <button
          type="button"
          class="m3-icon-button m3-icon-button--standard shrink-0"
          aria-label="Dismiss"
          @click="handleDismiss"
        >
          <XMarkIcon class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.error-slide-enter-active,
.error-slide-leave-active {
  transition: all 0.3s ease;
}

.error-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.error-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
