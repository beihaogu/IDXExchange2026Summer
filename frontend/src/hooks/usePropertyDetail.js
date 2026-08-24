import { useEffect, useState } from "react";
import { fetchProperty, fetchOpenHouses } from "../api/client";

/**
 * Loads one property and its open houses for a listing id.
 *
 * The two requests are chained rather than run in parallel: a missing id has
 * to surface as a single "property not found" error, and firing the open-house
 * request alongside it would only produce a second failure for a listing that
 * does not exist.
 *
 * The cancelled flag stops a response from a previous id writing to state
 * after the user has navigated to another listing.
 */
export function usePropertyDetail(id) {
  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError(null);

    fetchProperty(id)
      .then((propertyData) => {
        if (cancelled) return;
        setProperty(propertyData);
        return fetchOpenHouses(id).then((openHouseData) => {
          if (cancelled) return;
          setOpenHouses(openHouseData);
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setProperty(null);
        setError(err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { property, openHouses, isLoading, error };
}
