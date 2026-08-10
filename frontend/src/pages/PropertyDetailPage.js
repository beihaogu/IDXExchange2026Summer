import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchProperty, fetchOpenHouses } from "../api/client";
import { formatPrice } from "../utils/format";
import PropertyImageGallery from "../components/PropertyImageGallery";
import PropertyMap from "../components/PropertyMap";
import OpenHouseList from "../components/OpenHouseList";
import "./PropertyDetailPage.css";

const DETAIL_FIELDS = [
  ["L_Type_", "Property Type"],
  ["L_Status", "Status"],
  ["SubdivisionName", "Subdivision"],
  ["CountyOrParish", "County"],
  ["LotSizeAcres", "Lot Size (acres)"],
  ["GarageYN", "Garage"],
  ["PoolPrivateYN", "Pool"],
  ["FireplaceYN", "Fireplace"],
  ["ViewYN", "View"],
];

function PropertyDetailPage() {
  const { id } = useParams();
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

  return (
    <div className="property-detail-page">
      <Link to="/" className="property-detail-page__back">
        &larr; Back to listings
      </Link>

      {isLoading && <p className="property-detail-page__status">Loading property…</p>}

      {!isLoading && error && (
        <p className="property-detail-page__status property-detail-page__status--error">{error}</p>
      )}

      {!isLoading && !error && property && (
        <>
          <PropertyImageGallery rawPhotos={property.L_Photos} alt={property.L_Address} />

          <div className="property-detail-page__header">
            <h1 className="property-detail-page__price">{formatPrice(property.L_SystemPrice)}</h1>
            <div className="property-detail-page__address">
              {property.L_Address}
              <div className="property-detail-page__city-state">
                {[property.L_City, property.L_State, property.L_Zip].filter(Boolean).join(", ")}
              </div>
            </div>
          </div>

          <div className="property-detail-page__stats">
            <span>{property.L_Keyword2 != null ? `${property.L_Keyword2} bd` : "— bd"}</span>
            <span>{property.LM_Dec_3 != null ? `${Number(property.LM_Dec_3)} ba` : "— ba"}</span>
            <span>
              {property.LM_Int2_3 != null ? `${property.LM_Int2_3.toLocaleString()} sqft` : "— sqft"}
            </span>
            <span>{property.YearBuilt != null ? `Built ${property.YearBuilt}` : "Year built —"}</span>
          </div>

          {property.L_Remarks && (
            <section className="property-detail-page__section">
              <h2>Description</h2>
              <p className="property-detail-page__description">{property.L_Remarks}</p>
            </section>
          )}

          <section className="property-detail-page__section">
            <h2>Property Details</h2>
            <dl className="property-detail-page__details">
              {DETAIL_FIELDS.filter(([field]) => property[field] != null && property[field] !== "").map(
                ([field, label]) => (
                  <div key={field} className="property-detail-page__detail-row">
                    <dt>{label}</dt>
                    <dd>{String(property[field])}</dd>
                  </div>
                )
              )}
            </dl>
          </section>

          <section className="property-detail-page__section">
            <h2>Map</h2>
            <PropertyMap
              latitude={property.LMD_MP_Latitude}
              longitude={property.LMD_MP_Longitude}
              address={property.L_Address}
            />
          </section>

          <section className="property-detail-page__section">
            <h2>Open Houses</h2>
            <OpenHouseList openHouses={openHouses} />
          </section>
        </>
      )}
    </div>
  );
}

export default PropertyDetailPage;
