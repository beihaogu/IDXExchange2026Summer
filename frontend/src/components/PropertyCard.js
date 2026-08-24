import PropTypes from "prop-types";
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

// MySQL hands back DECIMAL columns (LM_Dec_3) as strings while INT columns
// (LM_Int2_3, L_Keyword2) come through as numbers, and L_ListingID is a string
// in the detail response but arrives as either from the list endpoint -- hence
// oneOfType rather than a single type per numeric-looking field.
const numericField = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

PropertyCard.propTypes = {
  property: PropTypes.shape({
    L_ListingID: numericField.isRequired,
    L_Address: PropTypes.string,
    L_City: PropTypes.string,
    L_State: PropTypes.string,
    L_SystemPrice: numericField,
    // A JSON-encoded array of URL strings, parsed by utils/photos.
    L_Photos: PropTypes.string,
    L_Keyword2: numericField,
    LM_Dec_3: numericField,
    LM_Int2_3: numericField,
  }).isRequired,
};

export default PropertyCard;
