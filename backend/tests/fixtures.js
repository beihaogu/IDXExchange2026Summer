/**
 * Row shapes mirror what MySQL actually returns: DECIMAL columns (LM_Dec_3)
 * arrive as strings, INT columns as numbers, and L_Photos as a JSON-encoded
 * string rather than an array.
 */
const listingRow = {
  L_ListingID: "123456789",
  L_Address: "1600 Pennsylvania Ave",
  L_City: "Portland",
  L_State: "OR",
  L_Zip: "97201",
  L_SystemPrice: 750000,
  L_Keyword2: 3,
  LM_Dec_3: "2.5",
  LM_Int2_3: 1800,
  L_Photos: '["https://example.com/1.jpg"]',
  LMD_MP_Latitude: "45.51",
  LMD_MP_Longitude: "-122.68",
  YearBuilt: 1998,
  LotSizeAcres: "0.15",
};

const openHouseRow = {
  L_ListingID: "123456789",
  OpenHouseDate: "2026-09-05",
  OH_StartTime: "13:00:00",
  OH_EndTime: "16:00:00",
  all_data: '{"OpenHouseRemarks":"Street parking only"}',
};

module.exports = { listingRow, openHouseRow };
