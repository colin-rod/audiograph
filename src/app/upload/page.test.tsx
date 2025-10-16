import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UploadPage from "./page";

const { createSupabaseClientMock, fromMock, deleteMock, notMock, isSupabaseConfiguredMock } =
  vi.hoisted(() => {
    const localNotMock = vi.fn();
    const localDeleteMock = vi.fn(() => ({ not: localNotMock }));
    const localFromMock = vi.fn(() => ({ delete: localDeleteMock }));
    const localCreateSupabaseClientMock = vi.fn(() => ({
      from: localFromMock,
    }));
    const localIsSupabaseConfiguredMock = vi.fn(() => true);

    return {
      createSupabaseClientMock: localCreateSupabaseClientMock,
      fromMock: localFromMock,
      deleteMock: localDeleteMock,
      notMock: localNotMock,
      isSupabaseConfiguredMock: localIsSupabaseConfiguredMock,
    };
  });

vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseClient: createSupabaseClientMock,
  isSupabaseConfigured: () => isSupabaseConfiguredMock(),
}));

describe("UploadPage reset controls", () => {
  beforeEach(() => {
    createSupabaseClientMock.mockClear();
    fromMock.mockClear();
    deleteMock.mockClear();
    notMock.mockClear();
    notMock.mockResolvedValue({ error: null });
    isSupabaseConfiguredMock.mockClear();
    isSupabaseConfiguredMock.mockReturnValue(true);
  });

  it("confirms with the user and deletes listens on approval", async () => {
    const user = userEvent.setup();

    render(<UploadPage />);

    const resetButton = screen.getByRole("button", { name: /reset uploaded data/i });
    await user.click(resetButton);

    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete uploaded listens?",
    });

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(fromMock).toHaveBeenCalledWith("listens"));
    expect(deleteMock).toHaveBeenCalled();
    expect(notMock).toHaveBeenCalledWith("ts", "is", null);

    await waitFor(() =>
      expect(screen.getByText("All uploaded listens have been deleted.")).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog", { name: "Delete uploaded listens?" })).toBeNull(),
    );
  });

  it("does not call Supabase when the user cancels", async () => {
    const user = userEvent.setup();

    render(<UploadPage />);

    const resetButton = screen.getByRole("button", { name: /reset uploaded data/i });
    await user.click(resetButton);

    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete uploaded listens?",
    });

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(fromMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(notMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Select a Spotify listening history JSON or ZIP export to begin."),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog", { name: "Delete uploaded listens?" })).toBeNull(),
    );
  });

  it("surfaces Supabase errors to the user", async () => {
    notMock.mockResolvedValueOnce({ error: { message: "failure" } });
    const user = userEvent.setup();

    render(<UploadPage />);

    const resetButton = screen.getByRole("button", { name: /reset uploaded data/i });
    await user.click(resetButton);

    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete uploaded listens?",
    });

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(notMock).toHaveBeenCalled());

    await waitFor(() =>
      expect(
        screen.getByText("Supabase returned an error while deleting. Please try again."),
      ).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog", { name: "Delete uploaded listens?" })).toBeNull(),
    );
  });
});
