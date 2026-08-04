import { nextTick, onBeforeUnmount, onMounted, type Ref } from "vue";

type ModalFocusOptions = {
  initialTarget?: () => HTMLElement | null;
  restoreTarget?: () => HTMLElement | null;
};

const modalStack: symbol[] = [];

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
  options: ModalFocusOptions = {},
) => {
  const modalKey = Symbol("modal");
  let previouslyFocused: HTMLElement | null = null;
  let restoreRequested = false;

  const isTopmost = () => modalStack[modalStack.length - 1] === modalKey;

  const handleKeydown = (event: KeyboardEvent) => {
    if (!isTopmost()) return;

    if (event.key === "Escape") {
      restoreRequested = true;
      event.preventDefault();
      event.stopImmediatePropagation();
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
    previouslyFocused = options.restoreTarget?.() ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null);
    modalStack.push(modalKey);
    window.addEventListener("keydown", handleKeydown);
    await nextTick();
    const dialog = dialogRef.value;
    if (!dialog) return;
    const initialTarget =
      options.initialTarget?.() ?? getFocusableElements(dialog)[0] ?? dialog;
    initialTarget.focus({ preventScroll: true });
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", handleKeydown);
    const stackIndex = modalStack.lastIndexOf(modalKey);
    if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
    const target = previouslyFocused;
    const dialog = dialogRef.value;
    const activeAtUnmount =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const focusWasInsideDialog = Boolean(
      dialog &&
        activeAtUnmount &&
        (activeAtUnmount === dialog || dialog.contains(activeAtUnmount)),
    );
    const restoreFocus = () => {
      const active =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      const focusMovedElsewhere = Boolean(
        active &&
          active !== document.body &&
          active !== document.documentElement &&
          active.isConnected,
      );
      if (
        (restoreRequested || focusWasInsideDialog) &&
        !focusMovedElsewhere &&
        target?.isConnected
      ) {
        target.focus({ preventScroll: true });
      }
    };
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(restoreFocus);
    } else {
      queueMicrotask(restoreFocus);
    }
  });
};
