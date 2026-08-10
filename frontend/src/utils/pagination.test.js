import { getPageNumbers, ELLIPSIS } from "./pagination";

describe("getPageNumbers", () => {
  it("lists every page when they all fit without a gap", () => {
    expect(getPageNumbers(1, 1)).toEqual([1]);
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("returns an empty list when there are no pages", () => {
    expect(getPageNumbers(1, 0)).toEqual([]);
    expect(getPageNumbers(1, NaN)).toEqual([]);
  });

  it("gaps only on the right while the current page is near the start", () => {
    expect(getPageNumbers(1, 24)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 24]);
    expect(getPageNumbers(3, 24)).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 24]);
  });

  it("gaps only on the left while the current page is near the end", () => {
    expect(getPageNumbers(24, 24)).toEqual([1, ELLIPSIS, 20, 21, 22, 23, 24]);
    expect(getPageNumbers(22, 24)).toEqual([1, ELLIPSIS, 20, 21, 22, 23, 24]);
  });

  it("gaps on both sides in the middle", () => {
    expect(getPageNumbers(5, 24)).toEqual([1, ELLIPSIS, 4, 5, 6, ELLIPSIS, 24]);
    expect(getPageNumbers(12, 24)).toEqual([1, ELLIPSIS, 11, 12, 13, ELLIPSIS, 24]);
  });

  // Debug Challenge: near the end the bar rendered the last page twice
  // ("1 ... 22 23 24 24"), because that branch appended totalPages on top of a
  // range that already ended with it.
  it("never repeats a page number, on any page of any size", () => {
    for (const totalPages of [8, 9, 15, 24, 100]) {
      for (let currentPage = 1; currentPage <= totalPages; currentPage += 1) {
        const pages = getPageNumbers(currentPage, totalPages);
        const numbers = pages.filter((page) => page !== ELLIPSIS);

        expect(numbers).toEqual([...new Set(numbers)]);
      }
    }
  });

  it("always anchors the list to the real first and last page", () => {
    for (let currentPage = 1; currentPage <= 24; currentPage += 1) {
      const pages = getPageNumbers(currentPage, 24);

      expect(pages[0]).toBe(1);
      expect(pages[pages.length - 1]).toBe(24);
    }
  });

  it("keeps the current page visible and the width constant while paging", () => {
    for (let currentPage = 1; currentPage <= 24; currentPage += 1) {
      const pages = getPageNumbers(currentPage, 24);

      expect(pages).toContain(currentPage);
      expect(pages).toHaveLength(7);
    }
  });

  it("never places an ellipsis where a single page number would fit", () => {
    // On page 3 only page 2 separates the current window from page 1, so the
    // left side is printed in full -- a gap standing in for one page would be
    // wider than the number it replaced.
    const nearStart = getPageNumbers(3, 24);
    expect(nearStart.filter((page) => page === ELLIPSIS)).toHaveLength(1);
    expect(nearStart).toEqual([1, 2, 3, 4, 5, ELLIPSIS, 24]);

    // One page further along there are two hidden pages, so the gap appears.
    expect(getPageNumbers(4, 24)).toEqual([1, ELLIPSIS, 3, 4, 5, ELLIPSIS, 24]);
  });

  it("widens the window when asked for more siblings", () => {
    expect(getPageNumbers(12, 24, { siblingCount: 2 })).toEqual([
      1,
      ELLIPSIS,
      10,
      11,
      12,
      13,
      14,
      ELLIPSIS,
      24,
    ]);
  });
});
