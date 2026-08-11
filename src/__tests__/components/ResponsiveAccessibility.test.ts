import { render, screen, within } from "@testing-library/vue";
import { createPinia } from "pinia";
import { describe, expect, it } from "vitest";
import ChoiceOptionsSection from "../../features/draw/components/ChoiceOptionsSection.vue";
import DrawBackdrop from "../../features/draw/components/DrawBackdrop.vue";
import HeroStage from "../../features/draw/components/HeroStage.vue";
import ResultDetailsSection from "../../features/draw/components/ResultDetailsSection.vue";
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
    expect(cardList.className).not.toContain("min-h-[17rem]");
    expect(cardList.className).not.toContain("sm:min-h-[21rem]");
    expect(cardList).not.toHaveClass("justify-end");
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

  it("renders an unavailable detail instead of an invalid EDHREC link", () => {
    const cardWithoutAnEdhrecIdentifier = createCard("non-latin", "東京");
    render(ResultDetailsSection, {
      props: {
        cards: [cardWithoutAnEdhrecIdentifier],
        group: [cardWithoutAnEdhrecIdentifier],
        showLinks: true,
        showMetadata: false,
      },
      global: { plugins: [createPinia()] },
    });

    expect(screen.getByText("EDHREC unavailable")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /edhrec/i }),
    ).not.toBeInTheDocument();
  });

  it("contains long pair details, rules text, and links at narrow widths", () => {
    const longName = "CommanderNameWithoutNaturalBreakOpportunities".repeat(5);
    const first = createCard("long-detail-one", `${longName}One`, {
      oracle_text: "OracleTextWithoutNaturalBreakOpportunities".repeat(8),
    });
    const second = createCard("long-detail-two", `${longName}Two`, {
      oracle_text: "SecondOracleTextWithoutNaturalBreakOpportunities".repeat(8),
    });
    const { container } = render(ResultDetailsSection, {
      props: {
        cards: [first, second],
        group: [first, second],
        pairLinkUrl: "https://edhrec.com/commanders/first-second",
        showLinks: true,
        showMetadata: false,
      },
      global: { plugins: [createPinia()] },
    });

    expect(container.firstElementChild).toHaveClass("min-w-0", "max-w-full");
    expect(screen.getByRole("heading", { level: 3 })).toHaveClass(
      "break-words",
      "[overflow-wrap:anywhere]",
    );
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveClass(
        "max-w-full",
        "whitespace-normal",
        "[overflow-wrap:anywhere]",
      );
    }
    for (const rules of screen.getAllByRole("region", { name: /card text for/i })) {
      expect(rules).toHaveClass("min-w-0", "max-w-full");
      expect(rules).toHaveTextContent(/oracletextwithoutnaturalbreak/i);
    }
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
