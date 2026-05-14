import { useEffect, useState } from "react";

const CACHE_KEY = "qprato:city";

export function useUserCity() {
  const [city, setCity] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(CACHE_KEY);
  });

  useEffect(() => {
    if (city) return;
    if (typeof window === "undefined" || !navigator.geolocation) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!token) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${token}&types=place&language=pt`
          );
          const json = await res.json();
          const name = json?.features?.[0]?.text as string | undefined;
          if (name) {
            window.localStorage.setItem(CACHE_KEY, name);
            setCity(name);
          }
        } catch {
          /* ignore */
        }
      },
      () => {},
      { timeout: 8000, maximumAge: 1000 * 60 * 60 * 24 }
    );
  }, [city]);

  return city;
}
