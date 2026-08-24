import { useCallback, useEffect, useRef, useState } from "react";
import { fetchProperties } from "../api/client";

export const ITEMS_PER_PAGE = 20;

const NO_FILTERS = {};
const NO_SORT = { sortBy: "", sortOrder: "" };

/**
 * Owns everything the listings page queries with: the active filters, the sort
 * pair, the current page, and the request they add up to. The page itself is
 * left with nothing but rendering.
 *
 * Filters, sort and page all reset each other in specific ways -- a new search
 * drops the sort and returns to page 1, a sort change keeps the filters but
 * returns to page 1 -- so they are kept together here rather than split across
 * several hooks that would have to coordinate.
 */
export function usePropertySearch() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [sort, setSort] = useState(NO_SORT);
  const [currentPage, setCurrentPage] = useState(1);
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

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const sortParams = sort.sortBy ? { sortBy: sort.sortBy, sortOrder: sort.sortOrder } : {};

    fetchProperties({ ...filters, ...sortParams, limit: ITEMS_PER_PAGE, offset })
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
  }, [filters, sort, currentPage]);

  const search = useCallback((nextFilters) => {
    setFilters(nextFilters);
    setSort(NO_SORT);
    setCurrentPage(1);
  }, []);

  const clear = useCallback(() => {
    setFilters(NO_FILTERS);
    setSort(NO_SORT);
    setCurrentPage(1);
  }, []);

  const changeSort = useCallback((sortBy, sortOrder) => {
    setSort({ sortBy, sortOrder });
    setCurrentPage(1);
  }, []);

  const goToPage = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  return {
    properties,
    total,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
    isLoading,
    error,
    sort,
    currentPage,
    search,
    clear,
    changeSort,
    goToPage,
  };
}
