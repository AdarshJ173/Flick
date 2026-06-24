/**
 * Reverse geocode a lat/lng to a human-readable area label.
 * Uses OpenStreetMap Nominatim (free, no API key needed).
 * Returns something like "Koramangala, Bangalore" or "IIT Delhi Area"
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "FlickApp/1.0" } },
    );
    if (!res.ok) return "your location";
    const data = await res.json();
    const a = data?.address ?? {};
    // Build a short label: neighbourhood/suburb + city
    const area =
      a.neighbourhood ||
      a.suburb ||
      a.quarter ||
      a.district ||
      a.city_district ||
      a.town ||
      a.village ||
      a.county;
    const city = a.city || a.town || a.municipality || a.state_district;
    if (area && city) return `${area}, ${city}`;
    if (area) return area;
    if (city) return city;
    return data?.display_name?.split(",")[0] ?? "your location";
  } catch {
    return "your location";
  }
}
