/** L_Photos stores a JSON array of photo URL strings; parses it defensively. */
export function parsePhotos(rawPhotos) {
  if (!rawPhotos) return [];
  try {
    const photos = JSON.parse(rawPhotos);
    return Array.isArray(photos) ? photos.filter(Boolean) : [];
  } catch {
    return [];
  }
}
