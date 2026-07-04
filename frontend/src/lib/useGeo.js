import { useCallback, useEffect, useState } from "react";

const KEY = "dental_geo";

/** Browser geolocation with localStorage caching. */
export default function useGeo() {
  const [coords, setCoords] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  });
  const [status, setStatus] = useState("idle"); // idle | locating | ok | denied

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        localStorage.setItem(KEY, JSON.stringify(c));
        setCoords(c);
        setStatus("ok");
      },
      () => setStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    if (coords) setStatus("ok");
  }, []); // eslint-disable-line

  return { coords, status, request };
}
