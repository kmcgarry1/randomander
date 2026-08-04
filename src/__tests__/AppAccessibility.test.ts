import { fireEvent, render, screen, waitFor, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { createPinia, setActivePinia, type Pinia } from "pinia";
import { nextTick } from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App.vue";
import { useRandomanderStore } from "../stores/randomander";

const renderApp = (pinia: Pinia = createPinia()) =>
  render(App, {
    global: { plugins: [pinia] },
  });

const navButton = (name: "History" | "Saved" | "Settings") =>
  screen.getAllByRole("button", { name: new RegExp(`^${name}$`, "i") })[0]!;

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("page hierarchy and panel navigation", () => {
  it("exposes one page h1 and a complete initial draw-mode guide", () => {
    renderApp();

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("Find a deck worth building.");
    expect(headings[0]).not.toHaveClass("hidden", "sr-only");

    const guide = screen.getByRole("list", { name: "Draw mode guide" });
    expect(within(guide).getByText("One legal commander.")).toBeInTheDocument();
    expect(within(guide).getByText("A legal partner pair.")).toBeInTheDocument();
    expect(
      within(guide).getByText("Three Commander-legal cards."),
    ).toBeInTheDocument();
  });

  it("focuses every panel safely and gives empty collections a direct Draw route", async () => {
    renderApp();
    const user = userEvent.setup();
    const randomize = screen.getByRole("button", { name: "Randomize" });

    const historyOpener = navButton("History");
    await user.click(historyOpener);
    let panel = await screen.findByRole("dialog", { name: "History" });
    await waitFor(() => expect(panel).toHaveFocus());
    expect(
      await within(panel).findByRole("button", { name: /clear history \(empty\)/i }),
    ).not.toHaveFocus();
    await user.click(
      await within(panel).findByRole("button", { name: "Start a draw" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "History" })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(randomize).toHaveFocus());

    await user.click(navButton("Saved"));
    panel = await screen.findByRole("dialog", { name: "Saved pulls" });
    await waitFor(() => expect(panel).toHaveFocus());
    expect(
      await within(panel).findByRole("button", { name: /clear saved pulls \(empty\)/i }),
    ).not.toHaveFocus();
    await user.click(
      await within(panel).findByRole("button", { name: "Start a draw" }),
    );
    await waitFor(() => expect(randomize).toHaveFocus());

    const settingsOpener = navButton("Settings");
    await user.click(settingsOpener);
    panel = await screen.findByRole("dialog", { name: "Settings" });
    await waitFor(() => expect(panel).toHaveFocus());
    await user.click(
      await within(panel).findByRole("button", { name: "Open history" }),
    );
    panel = await screen.findByRole("dialog", { name: "History" });
    await waitFor(() => expect(panel).toHaveFocus());
    await user.click(within(panel).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(settingsOpener).toHaveFocus());

    const optionsOpener = screen.getAllByRole("button", { name: "Filters" })[0]!;
    document.body.tabIndex = -1;
    document.body.focus();
    await fireEvent.click(optionsOpener);
    const options = await screen.findByRole("dialog", {
      name: "Randomizer options",
    });
    await waitFor(() => expect(options).toHaveFocus());
    document.body.focus();
    await fireEvent.keyDown(document.body, { key: "Escape" });
    await waitFor(() => expect(optionsOpener).toHaveFocus());
    document.body.removeAttribute("tabindex");
  });

  it("lets one Escape close a panel without skipping an active reveal beneath it", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    class ImmediateImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }

      decode = () => Promise.resolve();
    }
    vi.stubGlobal("Image", ImmediateImage);
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRandomanderStore(pinia);
    renderApp(pinia);
    store.cards = [
      {
        id: "reveal-card",
        name: "Reveal Stays Concealed",
        scryfall_uri: "https://scryfall.com/card/test/reveal-card",
        type_line: "Legendary Creature — Human Wizard",
        image_uris: {
          normal: "https://cards.scryfall.io/normal/reveal-card.jpg",
        },
      },
    ];
    await nextTick();
    const user = userEvent.setup();
    await screen.findByRole("button", { name: "Skip reveal" });

    await user.click(navButton("History"));
    const historyPanel = screen.getByRole("dialog", { name: "History" });
    await waitFor(() => expect(historyPanel).toHaveFocus());
    await user.keyboard("{Escape}");

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "History" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Skip reveal" })).toBeInTheDocument();
    expect(screen.queryByText("Reveal Stays Concealed")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(
      await screen.findByRole("heading", { name: "Reveal Stays Concealed" }),
    ).toBeInTheDocument();
  });
});
