import { render, screen } from "@testing-library/react";
import PropertyMap from "./PropertyMap";

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, REACT_APP_GOOGLE_MAPS_API_KEY: "test-key" };
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

function renderMap(props = {}) {
  return render(
    <PropertyMap latitude="34.052235" longitude="-118.243683" address="1 Oak St" {...props} />
  );
}

describe("PropertyMap", () => {
  it("embeds an iframe pointing at the property's coordinates", () => {
    renderMap();

    const frame = screen.getByTitle(/map of 1 oak st/i);
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-key&q=34.052235,-118.243683&zoom=15"
    );
  });

  // Acceptance criterion: a missing coordinate must not render a map centred
  // on 0,0 in the Atlantic.
  it("renders nothing when either coordinate is missing", () => {
    const { container, rerender } = renderMap({ latitude: null });
    expect(container).toBeEmptyDOMElement();

    rerender(<PropertyMap latitude="34.052235" longitude={null} address="1 Oak St" />);
    expect(container).toBeEmptyDOMElement();

    rerender(<PropertyMap latitude={undefined} longitude={undefined} address="1 Oak St" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("still renders for coordinates of exactly 0, which are valid", () => {
    renderMap({ latitude: 0, longitude: 0 });

    expect(screen.getByTitle(/map of 1 oak st/i)).toHaveAttribute(
      "src",
      "https://www.google.com/maps/embed/v1/place?key=test-key&q=0,0&zoom=15"
    );
  });

  it("links to Google Maps directions in a new tab", () => {
    renderMap();

    const link = screen.getByRole("link", { name: /get directions/i });
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=34.052235,-118.243683"
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("explains the missing key instead of rendering a broken frame", () => {
    delete process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    renderMap();

    expect(screen.getByText(/REACT_APP_GOOGLE_MAPS_API_KEY/)).toBeInTheDocument();
    expect(screen.queryByTitle(/map of/i)).not.toBeInTheDocument();
    // Directions only need coordinates, so that link survives a missing key.
    expect(screen.getByRole("link", { name: /get directions/i })).toBeInTheDocument();
  });
});
