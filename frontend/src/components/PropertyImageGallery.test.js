import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PropertyImageGallery from "./PropertyImageGallery";

const THREE_PHOTOS = JSON.stringify(["/a.jpg", "/b.jpg", "/c.jpg"]);

function renderGallery(rawPhotos = THREE_PHOTOS) {
  return render(<PropertyImageGallery rawPhotos={rawPhotos} alt="1 Oak St" />);
}

function mainImage() {
  return screen.getByRole("button", { name: /open photo lightbox/i }).querySelector("img");
}

function openLightbox() {
  userEvent.click(screen.getByRole("button", { name: /open photo lightbox/i }));
  return screen.getByRole("dialog");
}

/**
 * Dispatches a key on whatever currently holds focus, the way a browser routes
 * real key events. Firing straight at the overlay would pass even if nothing
 * were focusable, which is exactly the bug these tests guard against.
 */
function pressKey(key) {
  fireEvent.keyDown(document.activeElement, { key });
}

describe("PropertyImageGallery", () => {
  it("shows the first photo as the main image with a thumbnail per photo", () => {
    renderGallery();

    expect(mainImage()).toHaveAttribute("src", "/a.jpg");
    expect(screen.getAllByRole("button", { name: /show photo/i })).toHaveLength(3);
  });

  it("swaps the main image when a thumbnail is clicked", () => {
    renderGallery();

    userEvent.click(screen.getByRole("button", { name: /show photo 3/i }));

    expect(mainImage()).toHaveAttribute("src", "/c.jpg");
  });

  it("opens a lightbox on the current photo when the main image is clicked", () => {
    renderGallery();

    userEvent.click(screen.getByRole("button", { name: /show photo 2/i }));
    const dialog = openLightbox();

    expect(within(dialog).getByRole("img")).toHaveAttribute("src", "/b.jpg");
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();
  });

  it("navigates photos from inside the lightbox with the arrow buttons", () => {
    renderGallery();
    const dialog = openLightbox();

    userEvent.click(screen.getByRole("button", { name: /next photo/i }));
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();

    userEvent.click(screen.getByRole("button", { name: /previous photo/i }));
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
  });

  // Debug Challenge: the keydown handler was attached to a plain <div>, which
  // can never hold focus, so key events went to <body> and never reached it.
  // tabIndex={-1} plus a focus() on mount is the fix.
  it("focuses the overlay on open so it can receive key events at all", () => {
    renderGallery();
    const dialog = openLightbox();

    expect(dialog).toHaveAttribute("tabindex", "-1");
    expect(dialog).toHaveFocus();
  });

  it("closes on Escape", () => {
    renderGallery();
    openLightbox();

    pressKey("Escape");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("navigates photos with the left and right arrow keys", () => {
    renderGallery();
    const dialog = openLightbox();

    pressKey("ArrowRight");
    expect(within(dialog).getByText("2 / 3")).toBeInTheDocument();

    pressKey("ArrowLeft");
    expect(within(dialog).getByText("1 / 3")).toBeInTheDocument();
  });

  it("closes when the backdrop is clicked but not when the photo itself is", () => {
    renderGallery();
    const dialog = openLightbox();

    // Clicking the image must not fall through to the backdrop's close handler.
    userEvent.click(within(dialog).getByRole("img"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    userEvent.click(dialog);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides the thumbnail strip when there is only one photo", () => {
    renderGallery(JSON.stringify(["/only.jpg"]));

    expect(mainImage()).toHaveAttribute("src", "/only.jpg");
    expect(screen.queryByRole("button", { name: /show photo/i })).not.toBeInTheDocument();
  });

  it("falls back to a placeholder when there are no usable photos", () => {
    renderGallery(null);

    expect(screen.getByText(/no photo available/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /open photo lightbox/i })).not.toBeInTheDocument();
  });
});
