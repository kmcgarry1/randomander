import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";
import CardRulesText from "../../features/draw/components/CardRulesText.vue";
import type { ScryfallCard } from "../../lib/scryfall";

const createCard = (overrides: Partial<ScryfallCard> = {}): ScryfallCard => ({
  id: "card-1",
  name: "Atraxa, Praetors' Voice",
  scryfall_uri: "https://scryfall.com/card/example",
  type_line: "Legendary Creature — Phyrexian Angel Horror",
  oracle_text: "Flying, vigilance, deathtouch, lifelink",
  ...overrides,
});

describe("CardRulesText", () => {
  it("renders a semantic text alternative for a single-faced card", () => {
    render(CardRulesText, { props: { card: createCard() } });

    expect(
      screen.getByRole("region", {
        name: "Card text for Atraxa, Praetors' Voice",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Atraxa, Praetors' Voice",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Legendary Creature — Phyrexian Angel Horror"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Flying, vigilance, deathtouch, lifelink"),
    ).toBeInTheDocument();
  });

  it("renders the name, type line, and oracle text for every card face", () => {
    render(CardRulesText, {
      props: {
        card: createCard({
          id: "card-dfc",
          name: "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki",
          layout: "transform",
          type_line: "Enchantment — Saga",
          oracle_text: undefined,
          card_faces: [
            {
              name: "Fable of the Mirror-Breaker",
              type_line: "Enchantment — Saga",
              oracle_text: "Create a 2/2 red Goblin Shaman creature token.",
            },
            {
              name: "Reflection of Kiki-Jiki",
              type_line: "Enchantment Creature — Goblin Shaman",
              oracle_text:
                "Create a token that's a copy of another target nonlegendary creature you control.",
            },
          ],
        }),
      },
    });

    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Fable of the Mirror-Breaker",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Enchantment — Saga")).toBeInTheDocument();
    expect(
      screen.getByText("Create a 2/2 red Goblin Shaman creature token."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Reflection of Kiki-Jiki",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Enchantment Creature — Goblin Shaman"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create a token that's a copy of another target nonlegendary creature you control.",
      ),
    ).toBeInTheDocument();
  });

  it("states when a card legitimately has no oracle text", () => {
    render(CardRulesText, {
      props: {
        card: createCard({
          id: "card-vanilla",
          name: "Grizzly Bears",
          type_line: "Creature — Bear",
          oracle_text: "",
        }),
      },
    });

    expect(
      screen.getByRole("heading", { level: 4, name: "Grizzly Bears" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Creature — Bear")).toBeInTheDocument();
    expect(screen.getByText("No oracle text.")).toBeInTheDocument();
  });
});
