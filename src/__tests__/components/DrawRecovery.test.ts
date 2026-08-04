import { render, screen, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DrawView from "../../features/draw/DrawView.vue";
import { useRandomanderStore } from "../../stores/randomander";

describe("Draw recovery messaging", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("distinguishes a timeout and offers a new draw", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useRandomanderStore();
    store.errorMessage = "The request timed out after 15 seconds.";
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => {})));
    render(DrawView, { global: { plugins: [pinia] } });
    const user = userEvent.setup();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Draw timed out.");
    expect(alert).toHaveTextContent("The request timed out after 15 seconds.");
    const randomize = screen.getByRole("button", { name: /^randomize$/i });

    await user.click(
      within(alert).getByRole("button", { name: /try again/i }),
    );
    expect(randomize).toBeDisabled();
    expect(randomize).toHaveTextContent("Shuffling...");
    store.cancelActiveRequest();
  });
});
