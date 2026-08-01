import { render, screen } from "@testing-library/vue";
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
