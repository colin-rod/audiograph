import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UploadPage from "./page";

const { createSupabaseClientMock, fromMock, deleteMock, eqMock, useRouterMock, pushMock } = vi.hoisted(() => {
  const localEqMock = vi.fn();
  const localDeleteMock = vi.fn(() => ({ eq: localEqMock }));
  const localFromMock = vi.fn(() => ({ delete: localDeleteMock }));
  const push = vi.fn();
  const useRouter = vi.fn(() => ({
    push,
  }));
  const localCreateSupabaseClientMock = vi.fn(() => ({
    from: localFromMock,
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: "user-1", email: "user@example.com" } },
        error: null,
      })),
    },
  }));

  return {
    createSupabaseClientMock: localCreateSupabaseClientMock,
    fromMock: localFromMock,
    deleteMock: localDeleteMock,
    eqMock: localEqMock,
    useRouterMock: useRouter,
    pushMock: push,
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => useRouterMock(),
}));

vi.mock("@/lib/supabaseClient", () => ({
  createSupabaseClient: createSupabaseClientMock,
}));

describe("UploadPage reset controls", () => {
  beforeEach(() => {
    createSupabaseClientMock.mockClear();
    fromMock.mockClear();
    deleteMock.mockClear();
    eqMock.mockClear();
    eqMock.mockResolvedValue({ error: null });
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
    expect(eqMock).toHaveBeenCalledWith("user_id", "user-1");

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
    expect(eqMock).not.toHaveBeenCalled();
    expect(
      screen.getByText("Select a Spotify listening history file or ZIP archive to begin."),
    ).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog", { name: "Delete uploaded listens?" })).toBeNull(),
    );
  });

  it("surfaces Supabase errors to the user", async () => {
    eqMock.mockResolvedValueOnce({ error: { message: "failure" } });
    const user = userEvent.setup();

    render(<UploadPage />);

    const resetButton = screen.getByRole("button", { name: /reset uploaded data/i });
    await user.click(resetButton);

    const dialog = await screen.findByRole("alertdialog", {
      name: "Delete uploaded listens?",
    });

    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(eqMock).toHaveBeenCalled());

    await waitFor(() =>
      expect(
        screen.getByText("Supabase returned an error while deleting. Please try again."),
      ).toBeInTheDocument(),
    );

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog", { name: "Delete uploaded listens?" })).toBeNull(),
    );
  });

  it("displays a configuration error when Supabase client creation fails", () => {
    createSupabaseClientMock.mockImplementationOnce(() => {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined");
    });

    render(<UploadPage />);

    expect(
      screen.getByText(
        "Supabase environment variables are not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable uploads.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /choose file/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset uploaded data/i })).toBeDisabled();
  });
});
