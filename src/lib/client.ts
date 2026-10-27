"use client";

export async function api<T = any>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? "Error de conexión") as Error & { data?: any; status?: number };
    err.data = data;
    err.status = res.status;
    if (res.status === 401) window.location.href = "/login";
    throw err;
  }
  return data as T;
}

export type Store = { id: number; name: string; short: string; series: string; color: string; address: string; phone: string; ruc: string; owner: string };
export type CatalogModel = { name: string; brand: string; kind: string; type: string; def_ram: number; def_storage: number };
export type Catalog = { models: CatalogModel[]; colors: { name: string; hex: string }[]; brands: { name: string; color: string }[]; stores: Store[] };

export function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
