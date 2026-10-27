"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type Catalog } from "@/lib/client";

let cache: Catalog | null = null;

export function useCatalog() {
  const [cat, setCat] = useState<Catalog | null>(cache);
  const load = useCallback(async () => {
    const c = await api<Catalog>("/api/catalog");
    cache = c;
    setCat(c);
    return c;
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const brandColor = useCallback((b?: string | null) => cat?.brands.find((x) => x.name.toLowerCase() === (b ?? "").toLowerCase())?.color ?? "#64748b", [cat]);
  const colorHex = useCallback((c?: string | null) => cat?.colors.find((x) => x.name.toLowerCase() === (c ?? "").toLowerCase())?.hex ?? "#9ca3af", [cat]);
  return { cat, reload: load, brandColor, colorHex };
}
