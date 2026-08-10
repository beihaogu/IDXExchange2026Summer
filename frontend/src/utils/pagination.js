/** Marker for a gap in the page list; rendered as "…" and never clickable. */
export const ELLIPSIS = "ellipsis";

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Builds the page list shown in the pagination bar, e.g. [1, ELLIPSIS, 4, 5, 6,
 * ELLIPSIS, 24] for page 5 of 24.
 *
 * `siblingCount` is how many pages flank the current one. The widest layout is
 * first + last + current + 2 siblings + 2 ellipses, so anything at or below
 * that many pages is listed in full rather than abbreviated -- otherwise an
 * ellipsis could stand in for a single hidden page and take up more room than
 * the number it replaced.
 */
export function getPageNumbers(currentPage, totalPages, { siblingCount = 1 } = {}) {
  if (!Number.isFinite(totalPages) || totalPages < 1) return [];

  const maxSlots = siblingCount * 2 + 5;
  if (totalPages <= maxSlots) {
    return range(1, totalPages);
  }

  const leftSibling = Math.max(currentPage - siblingCount, 1);
  const rightSibling = Math.min(currentPage + siblingCount, totalPages);

  // An ellipsis only earns its place when it hides more than one page: page 2
  // sitting between 1 and 3 must be shown, not replaced by a gap of the same
  // width.
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < totalPages - 1;

  // The edge blocks are sized so the bar keeps a constant width as the user
  // pages through -- the numbers shift, the layout doesn't jump.
  const edgeBlockSize = siblingCount * 2 + 3;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, edgeBlockSize), ELLIPSIS, totalPages];
  }

  // Near the end, `totalPages` is already the last element of the range below.
  // Appending it again here is the duplicate-last-page bug -- see the
  // regression test in pagination.test.js.
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, ELLIPSIS, ...range(totalPages - edgeBlockSize + 1, totalPages)];
  }

  return [1, ELLIPSIS, ...range(leftSibling, rightSibling), ELLIPSIS, totalPages];
}
