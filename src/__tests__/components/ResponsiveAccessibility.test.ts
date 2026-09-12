import { render, screen, within } from "@testing-library/vue";
import { describe, expect, it } from "vitest";
import ChoiceOptionsSection from "../../features/draw/components/ChoiceOptionsSection.vue";
import DrawBackdrop from "../../features/draw/components/DrawBackdrop.vue";
import HeroStage from "../../features/draw/components/HeroStage.vue";
import type { ScryfallCard } from "../../lib/scryfall";

const createCard = (
  id: string,
  name: string,
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard => ({
  id,
  name,
  scryfall_uri: `https://scryfall.com/card/test/${id}`,
  type_line: "Legendary Creature — Very Long Creature Type",
  image_uris: {
    normal: `https://cards.scryfall.io/normal/${id}.jpg`,
    art_crop: `https://cards.scryfall.io/art_crop/${id}.jpg`,
  },
  ...overrides,
});

const doubleFacedCard = createCard(
  "long-dfc",
  "ACommanderNameThatCannotNaturallyBreak // AnotherExtremelyLongCardFaceName",
  {
    layout: "modal_dfc",
    image_uris: undefined,
    card_faces: [
      {
        name: "ACommanderNameThatCannotNaturallyBreak",
        image_uris: {
          normal: "https://cards.scryfall.io/normal/long-dfc-front.jpg",
        },
      },
      {
        name: "AnotherExtremelyLongCardFaceName",
        image_uris: {
          normal: "https://cards.scryfall.io/normal/long-dfc-back.jpg",
        },
      },
    ],
  },
);

describe("responsive and image-integrity contracts", () => {
  it("stacks phone choice pairs, wraps long labels, and keeps DFC controls outside the image", () => {
    const partner = createCard(
      "partner",
      "PartnerNameThatAlsoNeedsAnEmergencyWrapOpportunity",
    );
    render(ChoiceOptionsSection, {
      props: {
        choices: [{ id: "choice-1", cards: [doubleFacedCard, partner] }],
        isLoading: false,
        revealComplete: true,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
      },
    });

    const cardList = screen.getByRole("list", { name: "Cards in option 1" });
    expect(cardList).toHaveClass("flex-col", "sm:flex-row", "min-w-0");
    expect(cardList.className).not.toContain("min-[360px]:flex-row");
    for (const item of within(cardList).getAllByRole("listitem")) {
      expect(item).toHaveClass("w-full", "min-w-0");
    }

    const choiceTitle = screen.getByRole("heading", { level: 3 });
    expect(choiceTitle).toHaveClass("break-words", "[overflow-wrap:anywhere]");

    const turnControl = screen.getByRole("button", {
      name: /show anotherextremelylongcardfacename \(back face\)/i,
    });
    const cardFrame = turnControl.parentElement?.querySelector(".prestige-card");
    expect(cardFrame).not.toBeNull();
    expect(cardFrame).not.toContainElement(turnControl);
    expect(turnControl).not.toHaveClass("absolute");
    expect(turnControl).toHaveClass("max-w-full", "whitespace-normal");
    expect(
      screen.getByRole("img", {
        name: /acommandernamethatcannotnaturallybreak \(front face\)/i,
      }),
    ).toHaveClass("object-contain");
  });

  it("explains all draw modes in the initial result surface", () => {
    render(HeroStage, {
      props: {
        heroCards: [],
        mode: "commander",
      },
    });

    const guide = screen.getByRole("list", { name: "Draw mode guide" });
    expect(within(guide).getByText("Commander")).toBeInTheDocument();
    expect(within(guide).getByText("One legal commander.")).toBeInTheDocument();
    expect(within(guide).getByText("Partner pair")).toBeInTheDocument();
    expect(within(guide).getByText("A legal partner pair.")).toBeInTheDocument();
    expect(within(guide).getByText("3-card spark")).toBeInTheDocument();
    expect(
      within(guide).getByText("Three Commander-legal cards."),
    ).toBeInTheDocument();
  });

  it("renders an unavailable label instead of an invalid EDHREC link", () => {
    const cardWithoutAnEdhrecIdentifier = createCard("non-latin", "東京");
    render(ChoiceOptionsSection, {
      props: {
        choices: [
          { id: "choice-without-edhrec", cards: [cardWithoutAnEdhrecIdentifier] },
        ],
        isLoading: false,
        revealComplete: true,
        canRandomizeChoicePartner: () => false,
        onChoicePartner: () => undefined,
        getPartnerButtonLabel: () => "Find partner",
      },
    });

    expect(screen.getByText("東京 EDHREC unavailable")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /東京 edhrec/i }),
    ).not.toBeInTheDocument();
  });

  it("contains long pair summaries, prices, and links at narrow widths", () => {
    const longName = "CommanderNameWithoutNaturalBreakOpportunities".repeat(5);
    const first = createCard("long-detail-one", `${longName}One`, {
      prices: { eur: "0.35" },
      purchase_uris: {
        cardmarket: "https://www.cardmarket.com/en/Magic/Products/one",
      },
    });
    const second = createCard("long-detail-two", `${longName}Two`, {
      prices: { eur: "0.80" },
      purchase_uris: {
        cardmarket: "https://www.cardmarket.com/en/Magic/Products/two",
      },
    });
    const { container } = render(HeroStage, {
      props: {
        heroCardName: `${first.name} + ${second.name}`,
        heroCards: [first, second],
        heroScryfallUrl: "https://scryfall.com/card/test/long-detail-one",
        heroEdhrecUrl: "https://edhrec.com/commanders/first-second",
        showLinks: true,
        revealComplete: true,
        mode: "partner",
      },
    });

    expect(container.firstElementChild).toHaveClass("mx-auto", "max-w-4xl");
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass(
      "break-words",
      "[overflow-wrap:anywhere]",
    );
    expect(
      screen.getByRole("link", { name: /cardmarket price for .*0\.35/i }),
    ).toHaveAttribute("href", "https://www.cardmarket.com/en/Magic/Products/one");
    expect(
      screen.getByRole("link", { name: /cardmarket price for .*0\.80/i }),
    ).toHaveAttribute("href", "https://www.cardmarket.com/en/Magic/Products/two");
  });

  it("renders the standard ambient treatment without card images or URL styles", () => {
    const { container } = render(DrawBackdrop, {
      props: { ambient: true, simplified: false },
    });

    expect(screen.getByTestId("draw-backdrop")).toHaveAttribute(
      "data-mode",
      "full",
    );
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector('[style*="url("]')).not.toBeInTheDocument();
    expect(container.innerHTML).not.toContain("art_crop");
    expect(container.innerHTML).not.toContain("cards.scryfall.io");
  });
});
