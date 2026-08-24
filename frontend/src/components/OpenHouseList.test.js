import { render, screen } from "@testing-library/react";
import OpenHouseList from "./OpenHouseList";

function openHouse({ date = "2026-06-16T00:00:00.000Z", start = "09:00:00", end = "23:00:00", remarks } = {}) {
  return {
    L_ListingID: "1077426281",
    OpenHouseDate: date,
    OH_StartTime: start,
    OH_EndTime: end,
    all_data: JSON.stringify({ OpenHouseId: "1", OpenHouseRemarks: remarks ?? null }),
  };
}

describe("OpenHouseList", () => {
  it("shows the date and a formatted start/end time range", () => {
    render(<OpenHouseList openHouses={[openHouse()]} />);

    expect(screen.getByText("Tue, Jun 16, 2026")).toBeInTheDocument();
    expect(screen.getByText(/9:00 AM/)).toBeInTheDocument();
    expect(screen.getByText(/11:00 PM/)).toBeInTheDocument();
  });

  // Debug Challenge: remarks live inside the all_data JSON blob, not in a
  // column of their own, so they only appear if the component parses it.
  it("shows remarks pulled out of the all_data JSON blob", () => {
    render(
      <OpenHouseList openHouses={[openHouse({ remarks: "This Beautiful Family Home is Move In Ready" })]} />
    );

    expect(
      screen.getByText("This Beautiful Family Home is Move In Ready")
    ).toBeInTheDocument();
  });

  it("omits the remarks line when the blob has none", () => {
    const { rerender } = render(
      <OpenHouseList openHouses={[openHouse({ remarks: "Bring your agent" })]} />
    );
    expect(screen.getByText("Bring your agent")).toBeInTheDocument();

    // Same open house, blob without remarks: the line has to disappear rather
    // than render empty.
    rerender(<OpenHouseList openHouses={[openHouse()]} />);

    expect(screen.queryByText("Bring your agent")).not.toBeInTheDocument();
    expect(screen.getByText("Tue, Jun 16, 2026")).toBeInTheDocument();
  });

  it("renders every open house it is given", () => {
    render(
      <OpenHouseList
        openHouses={[
          openHouse({ date: "2026-06-16T00:00:00.000Z" }),
          openHouse({ date: "2026-06-20T00:00:00.000Z", start: "14:00:00", end: "16:00:00" }),
        ]}
      />
    );

    expect(screen.getByText("Tue, Jun 16, 2026")).toBeInTheDocument();
    expect(screen.getByText("Sat, Jun 20, 2026")).toBeInTheDocument();
  });

  // ~96% of listings have no matching open house rows (see the Week 4 data
  // note), so the empty state is the common case, not an edge case.
  it("shows a message when there are no open houses", () => {
    const { rerender } = render(<OpenHouseList openHouses={[]} />);
    expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();

    rerender(<OpenHouseList openHouses={undefined} />);
    expect(screen.getByText("No open houses scheduled")).toBeInTheDocument();
  });
});
