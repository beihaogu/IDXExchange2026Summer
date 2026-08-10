import { fireEvent, render, screen } from "@testing-library/react";
import Pagination from "./Pagination";

function renderPagination(props = {}) {
  const onPageChange = jest.fn();
  render(
    <Pagination currentPage={1} totalPages={1} onPageChange={onPageChange} {...props} />
  );
  return { onPageChange };
}

describe("Pagination", () => {
  it("renders nothing when there is only one page", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} onPageChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there are no pages", () => {
    const { container } = render(<Pagination currentPage={1} totalPages={0} onPageChange={jest.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on the first page", () => {
    renderPagination({ currentPage: 1, totalPages: 5 });
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });

  it("disables Next on the last page", () => {
    renderPagination({ currentPage: 5, totalPages: 5 });
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
  });

  it("enables both buttons on a middle page", () => {
    renderPagination({ currentPage: 3, totalPages: 5 });
    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });

  it("calls onPageChange with the clicked page number", () => {
    const { onPageChange } = renderPagination({ currentPage: 3, totalPages: 5 });

    fireEvent.click(screen.getByRole("button", { name: "1" }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("calls onPageChange with currentPage - 1 / + 1 for Previous / Next", () => {
    const { onPageChange } = renderPagination({ currentPage: 3, totalPages: 5 });

    fireEvent.click(screen.getByRole("button", { name: /previous/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
  });

  it("marks the current page with aria-current", () => {
    renderPagination({ currentPage: 3, totalPages: 5 });

    expect(screen.getByRole("button", { name: "3" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute("aria-current");
  });

  it("renders every page number without an ellipsis for a small page count", () => {
    renderPagination({ currentPage: 3, totalPages: 5 });

    for (const page of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole("button", { name: String(page) })).toBeInTheDocument();
    }
    expect(screen.queryByText("…")).not.toBeInTheDocument();
  });

  it("renders an ellipsis for a large page count, e.g. 1 … 4 5 6 … 24", () => {
    renderPagination({ currentPage: 5, totalPages: 24 });

    expect(screen.getAllByText("…")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "24" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-current", "page");
    // Only one button per page number -- the debug-challenge duplicate would
    // show up here as two buttons named "24".
    expect(screen.getAllByRole("button", { name: "24" })).toHaveLength(1);
  });

  // Debug Challenge: near the end of a large list, "24" used to appear twice
  // ("1 ... 22 23 24 24") because the page-number list itself had a duplicate.
  it("never renders a page number twice, including near the last page", () => {
    renderPagination({ currentPage: 24, totalPages: 24 });

    expect(screen.getAllByRole("button", { name: "24" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "24" })).toHaveAttribute("aria-current", "page");
  });
});
