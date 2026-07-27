import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProperties } from "../api/client";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import "./ListingsPage.css";

const NO_FILTERS = {};

function ListingsPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Every search/clear starts a request, and those requests can resolve out of
  // order. Only the newest one is allowed to write to state -- see the note in
  // the Week 6 README section.
  const latestRequestRef = useRef(0);

  useEffect(() => {
    const requestId = latestRequestRef.current + 1;
    latestRequestRef.current = requestId;
    const isStale = () => requestId !== latestRequestRef.current;

    setIsLoading(true);
    setError(null);

    fetchProperties(filters)
      .then((data) => {
        if (isStale()) return;
        setProperties(data.results);
        setTotal(data.total);
      })
      .catch((err) => {
        if (isStale()) return;
        setProperties([]);
        setTotal(0);
        setError(err.message);
      })
      .finally(() => {
        if (isStale()) return;
        setIsLoading(false);
      });
  }, [filters]);

  const handleSearch = useCallback((nextFilters) => {
    setFilters(nextFilters);
  }, []);

  const handleClear = useCallback(() => {
    setFilters(NO_FILTERS);
  }, []);

  return (
    <div className="listings-page">
      <PropertyFilters onSearch={handleSearch} onClear={handleClear} />
      {renderResults({ isLoading, error, properties, total })}
    </div>
  );
}

function renderResults({ isLoading, error, properties, total }) {
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

  return (
    <>
      <p className="listings-page__count">
        Showing {properties.length} of {total} properties
      </p>
      <div className="listings-page__grid">
        {properties.map((property) => (
          <PropertyCard key={property.L_ListingID} property={property} />
        ))}
      </div>
    </>
  );
}

export default ListingsPage;
