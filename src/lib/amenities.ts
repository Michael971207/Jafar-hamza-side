// Katalog over fasiliteter med ikon (emoji holder for MVP – lett å bytte til SVG senere).
// Nøkkelen lagres i Apartment.amenities (JSON-array av nøkler).

export type Amenity = {
  key: string;
  label: string;
  icon: string;
};

export const AMENITIES: Amenity[] = [
  { key: "wifi", label: "WiFi", icon: "📶" },
  { key: "parking", label: "Parkering", icon: "🅿️" },
  { key: "kitchen", label: "Kjøkken", icon: "🍳" },
  { key: "washer", label: "Vaskemaskin", icon: "🧺" },
  { key: "dryer", label: "Tørketrommel", icon: "🌀" },
  { key: "dishwasher", label: "Oppvaskmaskin", icon: "🧽" },
  { key: "tv", label: "TV", icon: "📺" },
  { key: "heating", label: "Oppvarming", icon: "🔥" },
  { key: "aircon", label: "Aircondition", icon: "❄️" },
  { key: "balcony", label: "Balkong", icon: "🌅" },
  { key: "elevator", label: "Heis", icon: "🛗" },
  { key: "pets", label: "Kjæledyr tillatt", icon: "🐾" },
  { key: "smoking", label: "Røyking tillatt", icon: "🚬" },
  { key: "workspace", label: "Arbeidsplass", icon: "💻" },
  { key: "coffee", label: "Kaffemaskin", icon: "☕" },
  { key: "bedlinen", label: "Sengetøy inkludert", icon: "🛏️" },
  { key: "selfcheckin", label: "Selvinnsjekk", icon: "🔑" },
  { key: "garden", label: "Hage/uteplass", icon: "🌳" },
  { key: "seaview", label: "Sjøutsikt", icon: "🌊" },
  { key: "charger", label: "Elbil-lader", icon: "🔌" },
];

const BY_KEY = new Map(AMENITIES.map((a) => [a.key, a]));

export function amenity(key: string): Amenity {
  return BY_KEY.get(key) ?? { key, label: key, icon: "•" };
}

export function amenitiesFromJson(json: string | null | undefined): Amenity[] {
  if (!json) return [];
  try {
    const keys = JSON.parse(json) as string[];
    if (!Array.isArray(keys)) return [];
    return keys.map(amenity);
  } catch {
    return [];
  }
}
