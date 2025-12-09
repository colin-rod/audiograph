import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import LandingPage from "./page";

// Mock the Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}));

describe("LandingPage", () => {
  it("highlights the hero copy, calls to action, privacy info, and screenshots", async () => {
    const component = await LandingPage();
    render(component);

    expect(
      screen.getByRole("heading", {
        name: /turn your spotify history into beautiful, shareable insights/i,
      }),
    ).toBeInTheDocument();

    const uploadLink = screen.getByRole("link", { name: /upload your history/i });
    // When not authenticated, should redirect to sign-in with next param
    expect(uploadLink).toHaveAttribute("href", "/sign-in?next=/upload");

    expect(screen.getByText(/your privacy stays center stage/i)).toBeInTheDocument();
    expect(
      screen.getByText(/uploads happen client-side and go straight to your supabase tables/i),
    ).toBeInTheDocument();

    expect(screen.getByAltText(/listening timeline preview/i)).toBeInTheDocument();
  });
});
