import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LandingPage from "./page";

describe("LandingPage", () => {
  it("highlights the hero copy, calls to action, privacy info, and screenshots", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", {
        name: /turn your spotify history into beautiful, shareable insights/i,
      }),
    ).toBeInTheDocument();

    const uploadLink = screen.getByRole("link", { name: /upload your history/i });
    expect(uploadLink).toHaveAttribute("href", "/upload");

    expect(screen.getByText(/your privacy stays center stage/i)).toBeInTheDocument();
    expect(
      screen.getByText(/uploads happen client-side and go straight to your supabase tables/i),
    ).toBeInTheDocument();

    expect(screen.getByAltText(/listening timeline preview/i)).toBeInTheDocument();
  });
});
