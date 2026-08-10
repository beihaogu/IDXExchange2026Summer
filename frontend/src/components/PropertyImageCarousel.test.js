import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyImageCarousel from "./PropertyImageCarousel";

const THREE_PHOTOS = JSON.stringify(["/a.jpg", "/b.jpg", "/c.jpg"]);

function next() {
  userEvent.click(screen.getByRole("button", { name: /next photo/i }));
}

function prev() {
  userEvent.click(screen.getByRole("button", { name: /previous photo/i }));
}

describe("PropertyImageCarousel", () => {
  it("shows the first photo and an X / Y counter", () => {
    render(<PropertyImageCarousel rawPhotos={THREE_PHOTOS} alt="1 Oak St" />);

    expect(screen.getByAltText("1 Oak St")).toHaveAttribute("src", "/a.jpg");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("cycles forward through the photos with the next arrow", () => {
    render(<PropertyImageCarousel rawPhotos={THREE_PHOTOS} alt="1 Oak St" />);

    next();
    expect(screen.getByAltText("1 Oak St")).toHaveAttribute("src", "/b.jpg");
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    next();
    expect(screen.getByAltText("1 Oak St")).toHaveAttribute("src", "/c.jpg");
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
  });

  it("wraps around in both directions", () => {
    render(<PropertyImageCarousel rawPhotos={THREE_PHOTOS} alt="1 Oak St" />);

    // Backwards off the first photo lands on the last one.
    prev();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();

    next();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  // Acceptance criterion: the card itself is a Link, so an unguarded arrow
  // click would bubble up and navigate to the detail page mid-browse.
  it("does not let an arrow click bubble up to the surrounding link", () => {
    const onParentClick = jest.fn();
    render(
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
      <div onClick={onParentClick}>
        <PropertyImageCarousel rawPhotos={THREE_PHOTOS} alt="1 Oak St" />
      </div>
    );

    next();
    prev();

    expect(onParentClick).not.toHaveBeenCalled();
  });

  it("hides the arrows and counter when there is only one photo", () => {
    render(<PropertyImageCarousel rawPhotos={JSON.stringify(["/only.jpg"])} alt="1 Oak St" />);

    expect(screen.getByAltText("1 Oak St")).toHaveAttribute("src", "/only.jpg");
    expect(screen.queryByRole("button", { name: /next photo/i })).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 1")).not.toBeInTheDocument();
  });

  it("falls back to a placeholder when the column is null or malformed", () => {
    const { rerender } = render(<PropertyImageCarousel rawPhotos={null} alt="1 Oak St" />);
    expect(screen.getByText(/no photo available/i)).toBeInTheDocument();

    rerender(<PropertyImageCarousel rawPhotos="{broken" alt="1 Oak St" />);
    expect(screen.getByText(/no photo available/i)).toBeInTheDocument();
  });
});
