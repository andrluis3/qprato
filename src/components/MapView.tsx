import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

export interface MapPin { id: string; lng: number; lat: number; name: string; }

export function MapView({
  pins, center, zoom = 12, onPinClick,
  className = "h-full w-full",
}: {
  pins: MapPin[];
  center?: [number, number];
  zoom?: number;
  onPinClick?: (id: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [token, setToken] = useState<string | undefined>(
    typeof window !== "undefined" ? (window as any).__MAPBOX_TOKEN__ ?? import.meta.env.VITE_MAPBOX_TOKEN : undefined
  );
  const [tokenInput, setTokenInput] = useState("");

  useEffect(() => {
    if (!token || !ref.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const c: [number, number] = center ?? (pins[0] ? [pins[0].lng, pins[0].lat] : [-46.6333, -23.5505]);
    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: c, zoom,
    });
    mapRef.current = map;
    pins.forEach((p) => {
      const el = document.createElement("div");
      el.className = "flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[oklch(0.66_0.22_25)] text-white shadow-lg ring-2 ring-background cursor-pointer";
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 11h.01"/><path d="M11 15h.01"/><path d="M16 16h.01"/><path d="m2 16 20 6-6-20A20 20 0 0 0 2 16"/><path d="M5.71 17.11a17.04 17.04 0 0 1 11.4-11.4"/></svg>`;
      el.onclick = () => onPinClick?.(p.id);
      new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(new mapboxgl.Popup({ offset: 20 }).setText(p.name)).addTo(map);
    });
    return () => { map.remove(); mapRef.current = null; };
  }, [token, pins, center, zoom, onPinClick]);

  if (!token) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-muted/40 p-6 text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          Para ver o mapa, cole sua chave pública do Mapbox.<br />
          Crie uma gratuita em <a className="underline" target="_blank" rel="noreferrer" href="https://account.mapbox.com/access-tokens/">mapbox.com</a>.
        </p>
        <div className="flex w-full max-w-md gap-2">
          <input
            type="text" placeholder="pk.ey..." value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => { (window as any).__MAPBOX_TOKEN__ = tokenInput; setToken(tokenInput); }}
            className="rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-white"
          >Aplicar</button>
        </div>
      </div>
    );
  }
  return <div ref={ref} className={className} />;
}
