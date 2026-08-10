import { formatOpenHouseDate, formatOpenHouseTime, parseOpenHouseRemarks } from "../utils/openHouse";
import "./OpenHouseList.css";

function OpenHouseList({ openHouses }) {
  if (!openHouses || openHouses.length === 0) {
    return <p className="open-house-list__empty">No open houses scheduled</p>;
  }

  return (
    <ul className="open-house-list">
      {openHouses.map((openHouse, idx) => {
        const remarks = parseOpenHouseRemarks(openHouse.all_data);
        return (
          <li key={`${openHouse.OpenHouseDate}-${openHouse.OH_StartTime}-${idx}`} className="open-house-list__item">
            <div className="open-house-list__date">{formatOpenHouseDate(openHouse.OpenHouseDate)}</div>
            <div className="open-house-list__time">
              {formatOpenHouseTime(openHouse.OH_StartTime)} – {formatOpenHouseTime(openHouse.OH_EndTime)}
            </div>
            {remarks && <p className="open-house-list__remarks">{remarks}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export default OpenHouseList;
