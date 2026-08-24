import PropTypes from "prop-types";
import "./PropertySort.css";

// Values are "<column>:<order>" pairs using the real rets_property column
// names the backend whitelists (see routes/properties.js) -- not RESO names.
export const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "L_SystemPrice:asc", label: "Price: Low to High" },
  { value: "L_SystemPrice:desc", label: "Price: High to Low" },
  { value: "ListingContractDate:desc", label: "Date Listed: Newest First" },
  { value: "ListingContractDate:asc", label: "Date Listed: Oldest First" },
  { value: "LM_Int2_3:desc", label: "Square Footage: High to Low" },
  { value: "LM_Int2_3:asc", label: "Square Footage: Low to High" },
  { value: "L_Keyword2:desc", label: "Beds: Most to Fewest" },
  { value: "L_Keyword2:asc", label: "Beds: Fewest to Most" },
];

function toOptionValue(sortBy, sortOrder) {
  return sortBy ? `${sortBy}:${sortOrder}` : "";
}

function PropertySort({ sortBy, sortOrder, onChange }) {
  function handleChange(event) {
    const [nextSortBy, nextSortOrder] = event.target.value
      ? event.target.value.split(":")
      : ["", ""];
    onChange(nextSortBy, nextSortOrder);
  }

  return (
    <div className="property-sort">
      <label htmlFor="property-sort-select">Sort by</label>
      <select
        id="property-sort-select"
        value={toOptionValue(sortBy, sortOrder)}
        onChange={handleChange}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

PropertySort.propTypes = {
  // "" for the Default option; otherwise a whitelisted column name and an
  // order, kept as two props so they map straight onto the query parameters.
  sortBy: PropTypes.string,
  sortOrder: PropTypes.oneOf(["", "asc", "desc"]),
  onChange: PropTypes.func.isRequired,
};

export default PropertySort;
