import { nextTick, onBeforeUnmount, onMounted, type Ref } from "vue";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const getFocusableElements = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      element.getAttribute("aria-hidden") !== "true" &&
      !element.hasAttribute("hidden"),
  );

export const useModalFocus = (
  dialogRef: Ref<HTMLElement | null>,
  close: () => void,
) => {
  let previouslyFocused: HTMLElement | null = null;

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.value) return;

    const focusable = getFocusableElements(dialogRef.value);
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.value.focus();
      return;
    }

    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialogRef.value)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  onMounted(async () => {
    previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    window.addEventListener("keydown", handleKeydown);
    await nextTick();
    const dialog = dialogRef.value;
    if (!dialog) return;
    const initialTarget = getFocusableElements(dialog)[0] ?? dialog;
    initialTarget.focus({ preventScroll: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
    const target = previouslyFocused;
    queueMicrotask(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
    });
  });
};
