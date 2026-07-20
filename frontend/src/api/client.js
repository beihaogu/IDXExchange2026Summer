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
