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

import { supabase } from "@/integrations/supabase/client";

let lastUpdate = 0;
export async function updateProfileLocation(lat: number, lng: number): Promise<void> {
  const now = Date.now();
  // Throttle updates to once every 1 minute to avoid overloading the DB
  if (now - lastUpdate < 60000) return;
  lastUpdate = now;
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({
        last_location: `POINT(${lng} ${lat})` as any,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  } catch (err) {
    console.error("Failed to update profile location passively:", err);
  }
}
