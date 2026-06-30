import { amenitiesFromJson } from "@/lib/amenities";

export function AmenityList({
  json,
  limit,
  className = "",
}: {
  json: string;
  limit?: number;
  className?: string;
}) {
  const all = amenitiesFromJson(json);
  const shown = limit ? all.slice(0, limit) : all;
  const rest = limit ? all.length - shown.length : 0;

  if (all.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {shown.map((a) => (
        <li key={a.key} className="chip" title={a.label}>
          <span aria-hidden>{a.icon}</span>
          <span>{a.label}</span>
        </li>
      ))}
      {rest > 0 && <li className="chip">+{rest} til</li>}
    </ul>
  );
}
