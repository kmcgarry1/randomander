import { render, screen, waitFor, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";
import { beforeEach, describe, expect, it } from "vitest";
import HistoryView from "../../features/history/HistoryView.vue";
import SavedView from "../../features/saved/SavedView.vue";
import DrawView from "../../features/draw/DrawView.vue";
import {
  MAX_HISTORY,
  MAX_SAVED,
  type OptionsState,
  type PullRecord,
  useRandomanderStore,
} from "../../stores/randomander";

const options: OptionsState = {
  colorCount: "any",
  selectedColors: [],
  limitByDecks: false,
  maxDecks: 1000,
  twoChoices: false,
  excludeGameChangers: false,
  useRankCutoff: false,
  colorCountMode: "up-to",
};

const createRecord = (id: string): PullRecord => ({
  id,
  createdAt: "2026-08-03T12:00:00.000Z",
  mode: "commander",
  options: { ...options },
  cards: [
    {
      id: `card-${id}`,
      name: `Card ${id}`,
      scryfall_uri: `https://scryfall.com/card/test/${id}`,
      type_line: "Legendary Creature — Human Wizard",
      image_uris: {
        small: `https://cards.scryfall.io/small/${id}.jpg`,
        normal: `https://cards.scryfall.io/normal/${id}.jpg`,
      },
    },
  ],
});

const renderWithStore = (component: typeof HistoryView | typeof SavedView) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const store = useRandomanderStore();
  const view = render(component, {
    props: { panel: true },
    global: { plugins: [pinia] },
  });
  return { store, ...view };
};

describe("History and Saved destructive-action safety", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("discloses rolling capacities and disables empty clear actions", () => {
    const history = renderWithStore(HistoryView);

    expect(
      screen.getByText(
        `History keeps the ${MAX_HISTORY} most recent pulls. Older pulls are removed automatically.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear history \(empty\)/i }),
    ).toBeDisabled();
    history.unmount();

    renderWithStore(SavedView);
    expect(
      screen.getByText(
        `Saved holds up to ${MAX_SAVED} pulls. At capacity, you choose before the oldest pull is replaced.`,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear saved pulls \(empty\)/i }),
    ).toBeDisabled();
  });

  it("uses contained Scryfall small images in dense collection lists", async () => {
    const history = renderWithStore(HistoryView);
    history.store.history = [createRecord("thumbnail-history")];
    await nextTick();

    expect(screen.getByRole("img", { name: "Card thumbnail-history" }))
      .toHaveAttribute(
        "src",
        "https://cards.scryfall.io/small/thumbnail-history.jpg",
      );
    expect(screen.getByRole("img", { name: "Card thumbnail-history" }))
      .toHaveClass("object-contain");
    history.unmount();

    const saved = renderWithStore(SavedView);
    saved.store.saved = [createRecord("thumbnail-saved")];
    await nextTick();

    expect(screen.getByRole("img", { name: "Card thumbnail-saved" }))
      .toHaveAttribute(
        "src",
        "https://cards.scryfall.io/small/thumbnail-saved.jpg",
      );
    expect(screen.getByRole("img", { name: "Card thumbnail-saved" }))
      .toHaveClass("object-contain");
  });

  it("cancels and confirms a one-item History clear with predictable focus", async () => {
    const { store } = renderWithStore(HistoryView);
    store.history = [createRecord("history-one")];
    await nextTick();
    const user = userEvent.setup();
    const clearButton = screen.getByRole("button", {
      name: /clear all 1 history pull/i,
    });

    await user.click(clearButton);
    let dialog = screen.getByRole("alertdialog", {
      name: /clear 1 history pull/i,
    });
    expect(dialog).toHaveTextContent(/permanently remove 1 history pull/i);
    const cancelButton = within(dialog).getByRole("button", { name: /cancel/i });
    await waitFor(() => expect(cancelButton).toHaveFocus());

    await user.click(cancelButton);
    expect(store.history).toHaveLength(1);
    await waitFor(() => expect(clearButton).toHaveFocus());

    await user.click(clearButton);
    dialog = screen.getByRole("alertdialog", {
      name: /clear 1 history pull/i,
    });
    await user.click(
      within(dialog).getByRole("button", { name: /clear 1 pull/i }),
    );

    expect(store.history).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cleared 1 history pull.",
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus(),
    );
  });

  it("cancels and confirms a one-item Saved clear with predictable focus", async () => {
    const { store } = renderWithStore(SavedView);
    store.saved = [createRecord("saved-one")];
    await nextTick();
    const user = userEvent.setup();
    const clearButton = screen.getByRole("button", {
      name: /clear all 1 saved pull/i,
    });

    await user.click(clearButton);
    let dialog = screen.getByRole("alertdialog", {
      name: /clear 1 saved pull/i,
    });
    const cancelButton = within(dialog).getByRole("button", { name: /cancel/i });
    await waitFor(() => expect(cancelButton).toHaveFocus());
    await user.click(cancelButton);

    expect(store.saved).toHaveLength(1);
    await waitFor(() => expect(clearButton).toHaveFocus());

    await user.click(clearButton);
    dialog = screen.getByRole("alertdialog", {
      name: /clear 1 saved pull/i,
    });
    await user.click(
      within(dialog).getByRole("button", { name: /clear 1 pull/i }),
    );

    expect(store.saved).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("Cleared 1 saved pull.");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus(),
    );
  });

  it("saves item 40 without a prompt", async () => {
    const { store } = renderWithStore(HistoryView);
    store.saved = Array.from({ length: MAX_SAVED - 1 }, (_, index) =>
      createRecord(`saved-${index}`),
    );
    store.history = [createRecord("candidate-40")];
    await nextTick();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^save$/i }));

    expect(store.saved).toHaveLength(MAX_SAVED);
    expect(store.saved[0]?.id).toBe("candidate-40");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("requires an explicit choice before item 41 replaces the oldest saved pull", async () => {
    const { store } = renderWithStore(HistoryView);
    store.saved = Array.from({ length: MAX_SAVED }, (_, index) =>
      createRecord(`saved-${index}`),
    );
    store.history = [createRecord("candidate-41")];
    await nextTick();
    const oldestId = `saved-${MAX_SAVED - 1}`;
    const user = userEvent.setup();
    const saveButton = screen.getByRole("button", { name: /^save$/i });

    await user.click(saveButton);
    let dialog = screen.getByRole("alertdialog", {
      name: /saved pulls is full/i,
    });
    expect(dialog).toHaveTextContent(`Saved holds ${MAX_SAVED} pulls.`);
    expect(dialog).toHaveTextContent("Card candidate-41");
    expect(dialog).toHaveTextContent(`Card ${oldestId}`);

    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));
    expect(store.saved).toHaveLength(MAX_SAVED);
    expect(store.saved.some((record) => record.id === oldestId)).toBe(true);
    await waitFor(() => expect(saveButton).toHaveFocus());

    await user.click(saveButton);
    dialog = screen.getByRole("alertdialog", {
      name: /saved pulls is full/i,
    });
    await user.click(
      within(dialog).getByRole("button", { name: /replace oldest/i }),
    );

    expect(store.saved).toHaveLength(MAX_SAVED);
    expect(store.saved[0]?.id).toBe("candidate-41");
    expect(store.saved.some((record) => record.id === oldestId)).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent(
      /saved card candidate-41 and removed the oldest saved pull/i,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Close" })).toHaveFocus(),
    );
  });

  it("protects the Save pull entry point with the same item-41 decision", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRandomanderStore();
    store.saved = Array.from({ length: MAX_SAVED }, (_, index) =>
      createRecord(`draw-saved-${index}`),
    );
    const candidate = createRecord("draw-candidate");
    store.cards = candidate.cards;
    store.display.enablePrestigeReveal = false;
    store.display.showTags = false;
    const oldestId = `draw-saved-${MAX_SAVED - 1}`;
    render(DrawView, { global: { plugins: [pinia] } });
    const user = userEvent.setup();
    const saveButton = await screen.findByRole("button", { name: /save pull/i });

    await user.click(saveButton);
    let dialog = screen.getByRole("alertdialog", {
      name: /saved pulls is full/i,
    });
    expect(dialog).toHaveTextContent("Card draw-candidate");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    expect(store.saved).toHaveLength(MAX_SAVED);
    expect(store.saved.some((record) => record.id === oldestId)).toBe(true);
    await waitFor(() => expect(saveButton).toHaveFocus());

    await user.click(saveButton);
    dialog = screen.getByRole("alertdialog", {
      name: /saved pulls is full/i,
    });
    await user.click(
      within(dialog).getByRole("button", { name: /replace oldest/i }),
    );

    expect(store.saved).toHaveLength(MAX_SAVED);
    expect(store.saved[0]?.cards[0]?.id).toBe("card-draw-candidate");
    expect(store.saved.some((record) => record.id === oldestId)).toBe(false);
    expect(
      screen.getByRole("button", { name: /pull saved/i }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /saved card draw-candidate and removed the oldest saved pull/i,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^randomize$/i })).toHaveFocus(),
    );
  });
});
