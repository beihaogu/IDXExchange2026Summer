import { useState } from "react";
import PropTypes from "prop-types";
import { parsePhotos } from "../utils/photos";
import Lightbox from "./Lightbox";
import "./PropertyImageGallery.css";

function PropertyImageGallery({ rawPhotos, alt }) {
  const [mainIndex, setMainIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const photos = parsePhotos(rawPhotos);

  if (photos.length === 0) {
    return (
      <div className="property-image-gallery property-image-gallery--empty">
        No photo available
      </div>
    );
  }

  return (
    <div className="property-image-gallery">
      <button
        type="button"
        className="property-image-gallery__main"
        onClick={() => setLightboxOpen(true)}
        aria-label="Open photo lightbox"
      >
        <img src={photos[mainIndex]} alt={alt || "Property"} />
      </button>

      {photos.length > 1 && (
        <div className="property-image-gallery__thumbnails">
          {photos.map((photo, idx) => (
            <button
              key={photo}
              type="button"
              className={
                idx === mainIndex
                  ? "property-image-gallery__thumbnail property-image-gallery__thumbnail--active"
                  : "property-image-gallery__thumbnail"
              }
              onClick={() => setMainIndex(idx)}
              aria-label={`Show photo ${idx + 1}`}
            >
              <img src={photo} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <Lightbox
          photos={photos}
          index={mainIndex}
          alt={alt}
          onNavigate={setMainIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}

PropertyImageGallery.propTypes = {
  // Raw L_Photos column: a JSON-encoded array of URLs, null when the listing
  // has no photos.
  rawPhotos: PropTypes.string,
  alt: PropTypes.string,
};

export default PropertyImageGallery;
