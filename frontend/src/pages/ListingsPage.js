import { useEffect, useState } from "react";
import { fetchProperties } from "../api/client";
import PropertyCard from "../components/PropertyCard";
import "./ListingsPage.css";

function ListingsPage() {
  const [properties, setProperties] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    setIsLoading(true);
    setError(null);

    fetchProperties()
      .then((data) => {
        if (isCancelled) return;
        setProperties(data.results);
        setTotal(data.total);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isLoading) {
    return <p className="listings-page__status">Loading properties…</p>;
  }

  if (error) {
    return <p className="listings-page__status listings-page__status--error">{error}</p>;
  }

  return (
    <div className="listings-page">
      <p className="listings-page__count">
        Showing {properties.length} of {total} properties
      </p>
      <div className="listings-page__grid">
        {properties.map((property) => (
          <PropertyCard key={property.L_ListingID} property={property} />
        ))}
      </div>
    </div>
  );
}

export default ListingsPage;
