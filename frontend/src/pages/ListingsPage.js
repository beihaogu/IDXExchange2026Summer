import { useCallback } from "react";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import PropertySort from "../components/PropertySort";
import Pagination from "../components/Pagination";
import { ITEMS_PER_PAGE, usePropertySearch } from "../hooks/usePropertySearch";
import "./ListingsPage.css";

function ListingsPage() {
  const {
    properties,
    total,
    totalPages,
    isLoading,
    error,
    sort,
    currentPage,
    search,
    clear,
    changeSort,
    goToPage,
  } = usePropertySearch();

  // Scrolling is the page's business, not the search state's, so it stays here
  // rather than inside the hook.
  const handlePageChange = useCallback(
    (page) => {
      goToPage(page);
      window.scrollTo(0, 0);
    },
    [goToPage]
  );

  return (
    <div className="listings-page">
      <PropertyFilters onSearch={search} onClear={clear} />
      <PropertySort sortBy={sort.sortBy} sortOrder={sort.sortOrder} onChange={changeSort} />
      {renderResults({
        isLoading,
        error,
        properties,
        total,
        totalPages,
        currentPage,
        onPageChange: handlePageChange,
      })}
    </div>
  );
}

function renderResults({
  isLoading,
  error,
  properties,
  total,
  totalPages,
  currentPage,
  onPageChange,
}) {
  if (isLoading) {
    return <p className="listings-page__status">Loading properties…</p>;
  }

  if (error) {
    return <p className="listings-page__status listings-page__status--error">{error}</p>;
  }

  if (properties.length === 0) {
    return (
      <p className="listings-page__status">
        No properties found. Try adjusting or clearing your filters.
      </p>
    );
  }

  const rangeStart = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = rangeStart + properties.length - 1;

  return (
    <>
      <p className="listings-page__count">
        Showing {rangeStart}-{rangeEnd} of {total} properties
      </p>
      <div className="listings-page__grid">
        {properties.map((property) => (
          <PropertyCard key={property.L_ListingID} property={property} />
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
    </>
  );
}

export default ListingsPage;
