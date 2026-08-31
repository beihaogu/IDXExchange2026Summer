import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ROUTER_FUTURE_FLAGS } from "../App";
import PropertyCard from "./PropertyCard";

// Mirrors a row from GET /api/properties: DECIMAL columns come back as strings,
// INT columns as numbers, and L_Photos as a JSON-encoded string.
const property = {
  L_ListingID: "123456789",
  L_Address: "1600 Pennsylvania Ave",
  L_City: "Portland",
  L_State: "OR",
  L_SystemPrice: 750000,
  L_Keyword2: 3,
  LM_Dec_3: "2.50",
  LM_Int2_3: 1800,
  L_Photos: '["https://example.com/1.jpg"]',
};

// The card is a <Link>, so it needs a router; rendering a detail route too lets
// the navigation assertion check where the click actually landed.
function renderCard(overrides = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]} future={ROUTER_FUTURE_FLAGS}>
      <Routes>
        <Route path="/" element={<PropertyCard property={{ ...property, ...overrides }} />} />
        <Route path="/property/:id" element={<div>Detail page for 123456789</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PropertyCard", () => {
  it("renders price, address, city/state and the bed/bath/sqft stats", () => {
    renderCard();

    expect(screen.getByText("$750,000")).toBeInTheDocument();
    expect(screen.getByText("1600 Pennsylvania Ave")).toBeInTheDocument();
    expect(screen.getByText("Portland, OR")).toBeInTheDocument();
    expect(screen.getByText("3 bd")).toBeInTheDocument();
    expect(screen.getByText("1,800 sqft")).toBeInTheDocument();
  });

  it("normalises the string DECIMAL baths to a plain number", () => {
    renderCard();

    // MySQL returns "2.50"; rendering it raw would read "2.50 ba".
    expect(screen.getByText("2.5 ba")).toBeInTheDocument();
  });

  it("renders the first photo with the address as alt text", () => {
    renderCard();

    expect(screen.getByRole("img", { name: "1600 Pennsylvania Ave" })).toHaveAttribute(
      "src",
      "https://example.com/1.jpg"
    );
  });

  it("falls back to a placeholder when the listing has no photos", () => {
    renderCard({ L_Photos: null });

    expect(screen.getByText(/no photo available/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("links to the detail page for its listing id", () => {
    renderCard();

    expect(screen.getByRole("link")).toHaveAttribute("href", "/property/123456789");
  });

  it("navigates to the detail page when clicked", () => {
    renderCard();

    userEvent.click(screen.getByRole("link"));

    expect(screen.getByText("Detail page for 123456789")).toBeInTheDocument();
  });

  it("shows em-dash placeholders instead of blanks for missing stats", () => {
    renderCard({ L_Keyword2: null, LM_Dec_3: null, LM_Int2_3: null });

    expect(screen.getByText("— bd")).toBeInTheDocument();
    expect(screen.getByText("— ba")).toBeInTheDocument();
    expect(screen.getByText("— sqft")).toBeInTheDocument();
  });

  it("shows a fallback message when the price is missing", () => {
    renderCard({ L_SystemPrice: null });

    expect(screen.getByText(/price unavailable/i)).toBeInTheDocument();
  });

  it("omits the separator when only the city is known", () => {
    renderCard({ L_State: null });

    expect(screen.getByText("Portland")).toBeInTheDocument();
  });
});
