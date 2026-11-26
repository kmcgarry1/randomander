import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";
import ChoiceOptionsSection from "../../features/draw/components/ChoiceOptionsSection.vue";
import type { ScryfallCard } from "../../lib/scryfall";

const createCard = (
  id: string,
  name: string,
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard => ({
  id,
  name,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
  type_line: "Legendary Creature — Human",
  image_uris: {
    normal: `https://cards.scryfall.io/normal/${id}.jpg`,
    art_crop: `https://cards.scryfall.io/art_crop/${id}.jpg`,
  },
  ...overrides,
});

describe("ChoiceOptionsSection reveal gating", () => {
  it("conceals commander names, facts, and links before reveal completes", () => {
    const commander1 = createCard("cmd-1", "Secret Commander One");
    const commander2 = createCard("cmd-2", "Secret Commander Two");
    
    render(ChoiceOptionsSection, {
      props: {
        choices: [
          { id: "choice-1", cards: [commander1] },
          { id: "choice-2", cards: [commander2] },
        ],
        isLoading: false,
        revealActive: false,
        revealComplete: false,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Preparing two options"
    );
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByText("Secret Commander One")).not.toBeInTheDocument();
    expect(screen.queryByText("Secret Commander Two")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("exposes titles, facts, and links after reveal completes", () => {
    const commander1 = createCard("cmd-1", "Public Commander One");
    const commander2 = createCard("cmd-2", "Public Commander Two");
    
    render(ChoiceOptionsSection, {
      props: {
        choices: [
          { id: "choice-1", cards: [commander1] },
          { id: "choice-2", cards: [commander2] },
        ],
        isLoading: false,
        revealActive: false,
        revealComplete: true,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Compare commanders"
    );
    expect(screen.getByText("Public Commander One")).toBeInTheDocument();
    expect(screen.getByText("Public Commander Two")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("gates link visibility on showLinks preference", () => {
    const commander = createCard("cmd", "Commander");

    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "choice", cards: [commander] }],
        isLoading: false,
        revealActive: false,
        revealComplete: true,
        showLinks: false,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    expect(screen.queryByText(/Scryfall/)).not.toBeInTheDocument();
    expect(screen.getByText("Commander")).toBeInTheDocument();
  });

  it("renders paired option titles correctly when revealed", () => {
    const partner1 = createCard("partner-1", "Card One");
    const partner2 = createCard("partner-2", "Card Two");
    
    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "pairing", cards: [partner1, partner2] }],
        isLoading: false,
        revealActive: false,
        revealComplete: true,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).toContain("Card One");
  });

  it("preserves focus target data-result-heading attribute", () => {
    const commander = createCard("cmd", "Commander");

    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "choice", cards: [commander] }],
        isLoading: false,
        revealActive: false,
        revealComplete: false,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    const resultHeading = screen.getByRole("heading", { level: 2 });
    expect(resultHeading).toHaveAttribute("data-result-heading");
    expect(resultHeading).toHaveAttribute("tabindex", "-1");
  });
});
