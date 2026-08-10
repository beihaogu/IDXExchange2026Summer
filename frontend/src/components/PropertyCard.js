import { Link } from "react-router-dom";
import PropertyImageCarousel from "./PropertyImageCarousel";
import { formatPrice } from "../utils/format";
import "./PropertyCard.css";

function PropertyCard({ property }) {
  const beds = property.L_Keyword2;
  const baths = property.LM_Dec_3;
  const sqft = property.LM_Int2_3;

  return (
    <Link to={`/property/${property.L_ListingID}`} className="property-card">
      <div className="property-card__photo">
        <PropertyImageCarousel rawPhotos={property.L_Photos} alt={property.L_Address} />
      </div>
      <div className="property-card__body">
        <div className="property-card__price">{formatPrice(property.L_SystemPrice)}</div>
        <div className="property-card__address">{property.L_Address}</div>
        <div className="property-card__city-state">
          {[property.L_City, property.L_State].filter(Boolean).join(", ")}
        </div>
        <div className="property-card__stats">
          <span>{beds != null ? `${beds} bd` : "— bd"}</span>
          <span>{baths != null ? `${Number(baths)} ba` : "— ba"}</span>
          <span>{sqft != null ? `${sqft.toLocaleString()} sqft` : "— sqft"}</span>
        </div>
      </div>
    </Link>
  );
}

export default PropertyCard;
