import { useState } from "react";
import PropTypes from "prop-types";
import { parsePhotos } from "../utils/photos";
import "./PropertyImageCarousel.css";

function PropertyImageCarousel({ rawPhotos, alt }) {
  const [index, setIndex] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const photos = parsePhotos(rawPhotos);

  if (photos.length === 0 || imageFailed) {
    return (
      <div className="property-image-carousel property-image-carousel--empty">
        No photo available
      </div>
    );
  }

  const showPrev = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current - 1 + photos.length) % photos.length);
  };

  const showNext = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + 1) % photos.length);
  };

  return (
    <div className="property-image-carousel">
      <img
        src={photos[index]}
        alt={alt || "Property"}
        loading="lazy"
        onError={() => setImageFailed(true)}
      />
      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="property-image-carousel__arrow property-image-carousel__arrow--prev"
            aria-label="Previous photo"
            onClick={showPrev}
          >
            &#8249;
          </button>
          <button
            type="button"
            className="property-image-carousel__arrow property-image-carousel__arrow--next"
            aria-label="Next photo"
            onClick={showNext}
          >
            &#8250;
          </button>
          <div className="property-image-carousel__counter">
            {index + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

// rawPhotos is the raw L_Photos column -- a JSON-encoded array of URLs, and
// null for listings with no photos. parsePhotos treats anything unparseable as
// empty, so the prop stays optional rather than required.
PropertyImageCarousel.propTypes = {
  rawPhotos: PropTypes.string,
  alt: PropTypes.string,
};

export default PropertyImageCarousel;
