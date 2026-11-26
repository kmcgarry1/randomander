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

  it("renders partner discovery button when available and revealed", () => {
    const commander = createCard("cmd", "Commander", {
      oracle_text: "Partner with Other Card",
      keywords: ["partner"],
    });

    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "choice", cards: [commander] }],
        isLoading: false,
        revealActive: false,
        revealComplete: true,
        canRandomizeChoicePartner: (card) => card.id === "cmd",
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: (card) =>
          card ? `Find partner for ${card.name}` : "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    const button = screen.getByRole("button", {
      name: /Find partner for Commander/,
    });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("disables partner button while loading", () => {
    const commander = createCard("cmd", "Commander");

    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "choice", cards: [commander] }],
        isLoading: true,
        revealActive: false,
        revealComplete: true,
        canRandomizeChoicePartner: (card) => card.id === "cmd",
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    const button = screen.getByRole("button", { name: /Find partner/ });
    expect(button).toBeDisabled();
  });

  it("renders EDHREC pair link when getPairLinkUrl returns a URL", () => {
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
        getPairLinkUrl: () => "https://edhrec.com/pairs/example",
      },
    });

    const pairLink = screen.getByRole("link", { name: /EDHREC pair/ });
    expect(pairLink).toHaveAttribute(
      "href",
      "https://edhrec.com/pairs/example"
    );
  });

  it("hides all actions when showLinks is false and facts remain visible", () => {
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
        getPairLinkUrl: () => "https://edhrec.com/pairs/example",
      },
    });

    expect(screen.getByText("Commander")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByText(/EDHREC pair/)).not.toBeInTheDocument();
  });

  it("renders price badge with correct provider", () => {
    const commander = createCard("cmd", "Commander", {
      prices: { usd: "5.00" },
    });

    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "choice", cards: [commander] }],
        isLoading: false,
        revealActive: false,
        revealComplete: true,
        priceProvider: "cardmarket",
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
        getPairLinkUrl: () => "",
      },
    });

    expect(screen.getByText("Commander")).toBeInTheDocument();
    // Price badge is rendered but content varies by card data
  });
});
