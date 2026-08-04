import { render, screen } from "@testing-library/vue";
import { defineComponent } from "vue";
import { describe, expect, it } from "vitest";
import ExternalLinkHint from "../../components/ExternalLinkHint.vue";

const ExternalLinkHarness = defineComponent({
  components: { ExternalLinkHint },
  template: `
    <a href="https://scryfall.com/card/test/example" target="_blank">
      Scryfall
      <ExternalLinkHint />
    </a>
  `,
});

describe("ExternalLinkHint", () => {
  it("adds one visible indicator and an explicit new-tab announcement", () => {
    render(ExternalLinkHarness);

    const link = screen.getByRole("link", {
      name: "Scryfall (opens in a new tab)",
    });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.querySelectorAll("svg")).toHaveLength(1);
    expect(link.querySelector(".sr-only")).toHaveTextContent(
      "(opens in a new tab)",
    );
  });
});
