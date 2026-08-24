import { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "./Lightbox.css";

function Lightbox({ photos, index, alt, onClose, onNavigate }) {
  const dialogRef = useRef(null);

  // A plain <div> never receives keydown events -- only elements that can
  // hold focus do. tabIndex={-1} makes it programmatically focusable (still
  // skipped by Tab-key navigation), and focusing it on mount is what lets
  // the Escape handler below actually fire.
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const showPrev = () => onNavigate((index - 1 + photos.length) % photos.length);
  const showNext = () => onNavigate((index + 1) % photos.length);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") onClose();
    if (event.key === "ArrowLeft") showPrev();
    if (event.key === "ArrowRight") showNext();
  };

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
      tabIndex={-1}
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      onClick={onClose}
    >
      <button type="button" className="lightbox__close" aria-label="Close" onClick={onClose}>
        &times;
      </button>
      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox__arrow lightbox__arrow--prev"
          aria-label="Previous photo"
          onClick={(event) => {
            event.stopPropagation();
            showPrev();
          }}
        >
          &#8249;
        </button>
      )}
      <img
        className="lightbox__image"
        src={photos[index]}
        alt={alt || "Property"}
        onClick={(event) => event.stopPropagation()}
      />
      {photos.length > 1 && (
        <button
          type="button"
          className="lightbox__arrow lightbox__arrow--next"
          aria-label="Next photo"
          onClick={(event) => {
            event.stopPropagation();
            showNext();
          }}
        >
          &#8250;
        </button>
      )}
      {photos.length > 1 && (
        <div className="lightbox__counter">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}

Lightbox.propTypes = {
  // Already-parsed URLs -- the gallery owns the parsing, this only displays.
  photos: PropTypes.arrayOf(PropTypes.string).isRequired,
  index: PropTypes.number.isRequired,
  alt: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
};

export default Lightbox;
