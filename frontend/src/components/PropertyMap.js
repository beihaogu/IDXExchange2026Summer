import PropTypes from "prop-types";
import "./PropertyMap.css";

function PropertyMap({ latitude, longitude, address }) {
  if (latitude == null || longitude == null) return null;

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const location = `${latitude},${longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location}`;

  return (
    <div className="property-map">
      {apiKey ? (
        <iframe
          className="property-map__frame"
          title={address ? `Map of ${address}` : "Property location"}
          src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${location}&zoom=15`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        <p className="property-map__missing-key">
          Map unavailable: set REACT_APP_GOOGLE_MAPS_API_KEY in frontend/.env to enable it.
        </p>
      )}
      <a
        className="property-map__directions"
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Get Directions
      </a>
    </div>
  );
}

// LMD_MP_Latitude/Longitude are DECIMAL columns, so they arrive as strings;
// they are also null for listings without coordinates, which is why the
// component renders nothing rather than requiring them.
PropertyMap.propTypes = {
  latitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  longitude: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  address: PropTypes.string,
};

export default PropertyMap;
