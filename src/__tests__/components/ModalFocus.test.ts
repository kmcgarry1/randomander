import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { defineComponent, ref } from "vue";
import { describe, expect, it } from "vitest";
import ConfirmationDialog from "../../components/layout/ConfirmationDialog.vue";
import SupportPanel from "../../components/layout/SupportPanel.vue";

const ModalHarness = defineComponent({
  components: { ConfirmationDialog, SupportPanel },
  setup() {
    const panelOpen = ref(false);
    const confirmationOpen = ref(false);
    return { confirmationOpen, panelOpen };
  },
  template: `
    <button type="button" @click="panelOpen = true">Open history</button>
    <SupportPanel
      v-if="panelOpen"
      label="History"
      @close="panelOpen = false"
    >
      <button type="button" @click="confirmationOpen = true">
        Clear history
      </button>
      <button type="button" @click="panelOpen = false">Close panel</button>
      <ConfirmationDialog
        v-if="confirmationOpen"
        title="Clear 1 history pull?"
        description="This removes one pull."
        confirm-label="Clear 1 pull"
        danger
        @cancel="confirmationOpen = false"
        @confirm="confirmationOpen = false"
      />
    </SupportPanel>
  `,
});

describe("modal focus stack", () => {
  it("uses a safe panel target, contains focus, and closes only the top surface", async () => {
    render(ModalHarness);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "Open history" });

    await user.click(opener);
    const panel = screen.getByRole("dialog", { name: "History" });
    const destructive = within(panel).getByRole("button", {
      name: "Clear history",
    });
    await waitFor(() => expect(panel).toHaveFocus());
    expect(destructive).not.toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(panel).toContainElement(document.activeElement as HTMLElement);
    const lastControl = within(panel).getByRole("button", {
      name: "Close panel",
    });
    expect(lastControl).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(destructive).toHaveFocus();

    await user.click(destructive);
    const confirmation = screen.getByRole("alertdialog", {
      name: "Clear 1 history pull?",
    });
    await waitFor(() =>
      expect(
        within(confirmation).getByRole("button", { name: "Cancel" }),
      ).toHaveFocus(),
    );

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("dialog", { name: "History" })).toBeInTheDocument();
    await waitFor(() => expect(destructive).toHaveFocus());

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "History" })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("restores the opener after Escape even if the browser clears modal focus first", async () => {
    render(ModalHarness);
    const user = userEvent.setup();
    const opener = screen.getByRole("button", { name: "Open history" });

    await user.click(opener);
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "History" })).toHaveFocus(),
    );

    document.body.tabIndex = -1;
    document.body.focus();
    expect(document.body).toHaveFocus();
    await fireEvent.keyDown(document.body, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "History" })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
    document.body.removeAttribute("tabindex");
  });
});
