import { useCallback, useEffect, useState } from "react";

const CACHE_KEY = "qprato:city";

export type CityStatus = "idle" | "loading" | "success" | "error";

export function useUserCity() {
  const [city, setCity] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(CACHE_KEY);
  });
  const [status, setStatus] = useState<CityStatus>(() => {
    if (typeof window === "undefined") return "idle";
    return window.localStorage.getItem(CACHE_KEY) ? "success" : "idle";
  });

  const detect = useCallback(() => {
    if (typeof window === "undefined") return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
    if (!navigator.geolocation || !token) {
      setStatus("error");
      return;
    }
    setStatus("loading");
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
            setStatus("success");
          } else {
            setStatus("error");
          }
        } catch {
          setStatus("error");
        }
      },
      () => setStatus("error"),
      { timeout: 8000, maximumAge: 1000 * 60 * 60 * 24 }
    );
  }, []);

  useEffect(() => {
    if (city) return;
    detect();
  }, [city, detect]);

  return { city, status, retry: detect };
}
