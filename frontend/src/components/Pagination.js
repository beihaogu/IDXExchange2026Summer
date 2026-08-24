import PropTypes from "prop-types";
import { ELLIPSIS, getPageNumbers } from "../utils/pagination";
import "./Pagination.css";

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination__nav"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>

      {pages.map((page, idx) =>
        page === ELLIPSIS ? (
          <span key={`ellipsis-${idx}`} className="pagination__ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            type="button"
            key={page}
            className={
              page === currentPage ? "pagination__page pagination__page--active" : "pagination__page"
            }
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        className="pagination__nav"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default Pagination;
