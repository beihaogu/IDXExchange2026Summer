import { useState } from "react";
import "./PropertyCard.css";

function parseFirstPhoto(rawPhotos) {
  if (!rawPhotos) return null;
  try {
    const photos = JSON.parse(rawPhotos);
    return Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
  } catch {
    return null;
  }
}

function formatPrice(price) {
  if (!price) return "Price unavailable";
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function PropertyCard({ property }) {
  const [imageFailed, setImageFailed] = useState(false);

  const photoUrl = parseFirstPhoto(property.L_Photos);
  const showPhoto = photoUrl && !imageFailed;

  const beds = property.L_Keyword2;
  const baths = property.LM_Dec_3;
  const sqft = property.LM_Int2_3;

  return (
    <div className="property-card">
      <div className="property-card__photo">
        {showPhoto ? (
          <img
            src={photoUrl}
            alt={property.L_Address || "Property"}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="property-card__photo-placeholder">No photo available</div>
        )}
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
    </div>
  );
}

export default PropertyCard;
