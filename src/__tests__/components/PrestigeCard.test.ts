import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import PrestigeCard from "../../features/draw/components/PrestigeCard.vue";
import type { ScryfallCard } from "../../lib/scryfall";

const card: ScryfallCard = {
  id: "prestige-card",
  name: "Atraxa, Praetors' Voice",
  scryfall_uri: "https://scryfall.com/card/example/atraxa-praetors-voice",
  image_uris: {
    normal: "https://cards.scryfall.io/normal/example/atraxa.jpg",
  },
};

const doubleFacedCard: ScryfallCard = {
  id: "double-faced-card",
  name: "Valki, God of Lies // Tibalt, Cosmic Impostor",
  scryfall_uri: "https://scryfall.com/card/example/valki",
  layout: "modal_dfc",
  card_faces: [
    {
      name: "Valki, God of Lies",
      image_uris: {
        normal: "https://cards.scryfall.io/normal/example/valki.jpg",
      },
    },
    {
      name: "Tibalt, Cosmic Impostor",
      image_uris: {
        normal: "https://cards.scryfall.io/normal/example/tibalt.jpg",
      },
    },
  ],
};

const readTiming = (element: HTMLElement) => ({
  delay: Number.parseFloat(
    element.style.getPropertyValue("--reveal-delay").replace("ms", ""),
  ),
  duration: Number.parseFloat(
    element.style.getPropertyValue("--reveal-duration").replace("ms", ""),
  ),
});

describe("PrestigeCard", () => {
  it("renders a decorative card back and conceals the front while revealing", () => {
    const { container } = render(PrestigeCard, {
      props: { card, revealing: true },
    });

    const cardBack = container.querySelector(".prestige-card__back");
    const cardFront = container.querySelector(".prestige-card__front");
    const frontImage = container.querySelector<HTMLImageElement>(
      ".prestige-card__image",
    );

    expect(cardBack).toBeInTheDocument();
    expect(cardBack).toHaveAttribute("aria-hidden", "true");
    expect(cardFront).toHaveAttribute("aria-hidden", "true");
    expect(frontImage).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img", { name: card.name })).not.toBeInTheDocument();
  });

  it("exposes the revealed card image by name when the sequence completes", () => {
    render(PrestigeCard, {
      props: { card, revealing: false },
    });

    expect(screen.getByRole("img", { name: card.name })).toBeInTheDocument();
  });

  it("turns a double-faced card and exposes the visible face accessibly", async () => {
    render(PrestigeCard, {
      props: { card: doubleFacedCard, revealing: false, concealed: false },
    });
    const user = userEvent.setup();

    expect(
      screen.getByRole("img", { name: "Valki, God of Lies (front face)" }),
    ).toHaveAttribute(
      "src",
      "https://cards.scryfall.io/normal/example/valki.jpg",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Show Tibalt, Cosmic Impostor (back face)",
      }),
    );

    expect(
      screen.getByRole("img", {
        name: "Tibalt, Cosmic Impostor (back face)",
      }),
    ).toHaveAttribute(
      "src",
      "https://cards.scryfall.io/normal/example/tibalt.jpg",
    );

    const showFront = screen.getByRole("button", {
      name: "Show Valki, God of Lies (front face)",
    });
    showFront.focus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("img", { name: "Valki, God of Lies (front face)" }),
    ).toBeInTheDocument();
  });

  it("does not expose the turn control while concealed or for one-image cards", async () => {
    const rendered = render(PrestigeCard, {
      props: { card: doubleFacedCard, concealed: true },
    });

    expect(
      screen.queryByRole("button", { name: /show .* face/i }),
    ).not.toBeInTheDocument();
    expect(
      rendered.container.querySelector<HTMLImageElement>(
        ".prestige-card__image",
      ),
    ).toHaveAttribute("alt", "");
    expect(
      rendered.container.querySelector<HTMLImageElement>(
        ".prestige-card__front img.hidden",
      ),
    ).toHaveAttribute(
      "src",
      "https://cards.scryfall.io/normal/example/tibalt.jpg",
    );

    await rendered.rerender({ card, concealed: false });
    expect(
      screen.queryByRole("button", { name: /show .* face/i }),
    ).not.toBeInTheDocument();
  });

  it("does not treat logical split faces as turnable", () => {
    render(PrestigeCard, {
      props: {
        card: {
          ...doubleFacedCard,
          id: "split-card",
          layout: "split",
        },
      },
    });

    expect(
      screen.queryByRole("button", { name: /show .* face/i }),
    ).not.toBeInTheDocument();
  });

  it("resets to the front when the rendered card changes", async () => {
    const rendered = render(PrestigeCard, {
      props: { card: doubleFacedCard },
    });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Show Tibalt, Cosmic Impostor (back face)",
      }),
    );
    await rendered.rerender({
      card: {
        ...doubleFacedCard,
        id: "second-double-faced-card",
        name: "Esika, God of the Tree // The Prismatic Bridge",
        card_faces: [
          {
            name: "Esika, God of the Tree",
            image_uris: {
              normal: "https://cards.scryfall.io/normal/example/esika.jpg",
            },
          },
          {
            name: "The Prismatic Bridge",
            image_uris: {
              normal: "https://cards.scryfall.io/normal/example/bridge.jpg",
            },
          },
        ],
      },
    });

    expect(
      screen.getByRole("img", {
        name: "Esika, God of the Tree (front face)",
      }),
    ).toHaveAttribute(
      "src",
      "https://cards.scryfall.io/normal/example/esika.jpg",
    );
    expect(
      screen.getByRole("button", {
        name: "Show The Prismatic Bridge (back face)",
      }),
    ).toBeInTheDocument();
  });

  it("resets to the front when an existing card is concealed again", async () => {
    const rendered = render(PrestigeCard, {
      props: { card: doubleFacedCard, concealed: false },
    });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", {
        name: "Show Tibalt, Cosmic Impostor (back face)",
      }),
    );
    await rendered.rerender({ concealed: true });
    expect(
      screen.queryByRole("button", { name: /show .* face/i }),
    ).not.toBeInTheDocument();

    await rendered.rerender({ concealed: false });
    expect(
      screen.getByRole("img", { name: "Valki, God of Lies (front face)" }),
    ).toHaveAttribute(
      "src",
      "https://cards.scryfall.io/normal/example/valki.jpg",
    );
  });

  it("keeps every card-count sequence within the same 2400ms total", () => {
    const timings = [1, 2, 3, 4].map((total) => {
      const { container, unmount } = render(PrestigeCard, {
        props: {
          card,
          revealing: true,
          index: total - 1,
          total,
        },
      });
      const prestigeCard = container.querySelector<HTMLElement>(".prestige-card");

      expect(prestigeCard).not.toBeNull();
      const timing = readTiming(prestigeCard!);
      unmount();

      return { total, ...timing };
    });

    for (const timing of timings) {
      expect(timing.delay + timing.duration).toBe(2400);
    }

    const singleDuration = timings[0]!.duration;
    for (const timing of timings.slice(1)) {
      expect(timing.duration).toBeLessThan(singleDuration);
    }
  });
});
