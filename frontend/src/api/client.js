const API_BASE_URL = "/api";

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function fetchProperties(params = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/properties${buildQueryString(params)}`);
  } catch {
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Failed to fetch properties (HTTP ${response.status})`);
  }

  return response.json();
}

export async function fetchProperty(id) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/properties/${encodeURIComponent(id)}`);
  } catch {
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Failed to fetch property (HTTP ${response.status})`);
  }

  return response.json();
}

export async function fetchOpenHouses(id) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/properties/${encodeURIComponent(id)}/openhouses`);
  } catch {
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `Failed to fetch open houses (HTTP ${response.status})`);
  }

  return response.json();
}
