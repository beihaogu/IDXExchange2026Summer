import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PropertyDetailPage from "./PropertyDetailPage";
import { ROUTER_FUTURE_FLAGS } from "../App";
import { fetchProperty, fetchOpenHouses } from "../api/client";

jest.mock("../api/client");

const PROPERTY = {
  L_ListingID: "1077426281",
  L_Address: "1 Oak St",
  L_City: "Portland",
  L_State: "OR",
  L_Zip: "97201",
  L_SystemPrice: 750000,
  L_Keyword2: 3,
  LM_Dec_3: "2.5",
  LM_Int2_3: 1800,
  YearBuilt: 1994,
  L_Remarks: "A quiet cul-de-sac home with a large yard.",
  L_Photos: JSON.stringify(["/a.jpg", "/b.jpg"]),
  LMD_MP_Latitude: "45.512230",
  LMD_MP_Longitude: "-122.658722",
  L_Type_: "Residential",
  L_Status: "Active",
};

/** Renders the page at /property/:id so useParams() sees a real id. */
function renderDetail(id = "1077426281") {
  return render(
    <MemoryRouter initialEntries={[`/property/${id}`]} future={ROUTER_FUTURE_FLAGS}>
      <Routes>
        <Route path="/property/:id" element={<PropertyDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  jest.resetAllMocks();
});

describe("PropertyDetailPage", () => {
  it("fetches the property and its open houses using the id from the URL", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockResolvedValue([]);

    renderDetail("1077426281");
    expect(screen.getByText(/loading property/i)).toBeInTheDocument();

    await screen.findByText("1 Oak St");
    expect(fetchProperty).toHaveBeenCalledWith("1077426281");
    expect(fetchOpenHouses).toHaveBeenCalledWith("1077426281");
  });

  it("renders the price, address, stats and description", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockResolvedValue([]);

    renderDetail();

    expect(await screen.findByText("$750,000")).toBeInTheDocument();
    expect(screen.getByText("1 Oak St")).toBeInTheDocument();
    expect(screen.getByText("Portland, OR, 97201")).toBeInTheDocument();
    expect(screen.getByText("3 bd")).toBeInTheDocument();
    expect(screen.getByText("2.5 ba")).toBeInTheDocument();
    expect(screen.getByText("1,800 sqft")).toBeInTheDocument();
    expect(screen.getByText("Built 1994")).toBeInTheDocument();
    expect(screen.getByText(/quiet cul-de-sac/i)).toBeInTheDocument();
  });

  it("renders the photo gallery and the map for the property", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockResolvedValue([]);

    renderDetail();
    await screen.findByText("1 Oak St");

    expect(screen.getByRole("button", { name: /open photo lightbox/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /get directions/i })).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=45.512230,-122.658722"
    );
  });

  it("shows open houses with their remarks", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockResolvedValue([
      {
        OpenHouseDate: "2026-06-16T00:00:00.000Z",
        OH_StartTime: "09:00:00",
        OH_EndTime: "23:00:00",
        all_data: JSON.stringify({ OpenHouseRemarks: "Move in ready" }),
      },
    ]);

    renderDetail();

    expect(await screen.findByText("Tue, Jun 16, 2026")).toBeInTheDocument();
    expect(screen.getByText("Move in ready")).toBeInTheDocument();
  });

  it("shows the empty message when the listing has no open houses", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockResolvedValue([]);

    renderDetail();

    expect(await screen.findByText("No open houses scheduled")).toBeInTheDocument();
  });

  // Acceptance criterion: /property/invalid-id must show an error, not crash.
  it("shows the API error for an unknown id instead of crashing", async () => {
    fetchProperty.mockRejectedValue(new Error("No property found with id invalid-id"));
    fetchOpenHouses.mockResolvedValue([]);

    renderDetail("invalid-id");

    expect(await screen.findByText("No property found with id invalid-id")).toBeInTheDocument();
    expect(screen.queryByText(/loading property/i)).not.toBeInTheDocument();
  });

  it("still shows the property when only the open house request fails", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockRejectedValue(new Error("Failed to fetch open houses (HTTP 500)"));

    renderDetail();

    expect(await screen.findByText("Failed to fetch open houses (HTTP 500)")).toBeInTheDocument();
  });

  it("always offers a link back to the listings page", async () => {
    fetchProperty.mockResolvedValue(PROPERTY);
    fetchOpenHouses.mockResolvedValue([]);

    renderDetail();
    await screen.findByText("1 Oak St");

    expect(screen.getByRole("link", { name: /back to listings/i })).toHaveAttribute("href", "/");
  });
});
