import { useState } from "react";
import PropTypes from "prop-types";
import "./PropertyFilters.css";

const EMPTY_FILTERS = {
  city: "",
  zipcode: "",
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
};

const BED_OPTIONS = ["1", "2", "3", "4", "5"];
const BATH_OPTIONS = ["1", "1.5", "2", "2.5", "3", "4"];

// The backend treats a present-but-empty parameter as an error (`city must not
// be empty`), so blank inputs have to be dropped before the request is built
// rather than sent as "".
export function stripEmptyFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
      .filter(([, value]) => value !== "" && value !== null && value !== undefined)
  );
}

function PropertyFilters({ onSearch, onClear }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  function handleChange(event) {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSearch(stripEmptyFilters(filters));
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS);
    onClear();
  }

  return (
    <form className="property-filters" onSubmit={handleSubmit}>
      <div className="property-filters__field">
        <label htmlFor="filter-city">City</label>
        <input
          id="filter-city"
          name="city"
          type="text"
          placeholder="Los Angeles"
          value={filters.city}
          onChange={handleChange}
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-zipcode">ZIP code</label>
        <input
          id="filter-zipcode"
          name="zipcode"
          type="text"
          placeholder="90049"
          value={filters.zipcode}
          onChange={handleChange}
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-min-price">Min price</label>
        <input
          id="filter-min-price"
          name="minPrice"
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={filters.minPrice}
          onChange={handleChange}
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-max-price">Max price</label>
        <input
          id="filter-max-price"
          name="maxPrice"
          type="number"
          min="0"
          step="any"
          placeholder="Any"
          value={filters.maxPrice}
          onChange={handleChange}
        />
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-beds">Beds</label>
        <select id="filter-beds" name="beds" value={filters.beds} onChange={handleChange}>
          <option value="">Any</option>
          {BED_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}+
            </option>
          ))}
        </select>
      </div>

      <div className="property-filters__field">
        <label htmlFor="filter-baths">Baths</label>
        <select id="filter-baths" name="baths" value={filters.baths} onChange={handleChange}>
          <option value="">Any</option>
          {BATH_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {value}+
            </option>
          ))}
        </select>
      </div>

      <div className="property-filters__actions">
        <button type="submit" className="property-filters__button">
          Search
        </button>
        <button
          type="button"
          className="property-filters__button property-filters__button--secondary"
          onClick={handleClear}
        >
          Clear Filters
        </button>
      </div>
    </form>
  );
}

PropertyFilters.propTypes = {
  // Called with the stripped filter object; blank fields are dropped first.
  onSearch: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

export default PropertyFilters;
