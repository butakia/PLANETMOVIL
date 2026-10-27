"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

/** Escáner con la cámara del celular (código de barras / QR). Se usa en lugar de la pistola. */
export default function BarcodeScanner({ onScan, onClose, continuous = false }: { onScan: (code: string) => void; onClose: () => void; continuous?: boolean }) {
  const [err, setErr] = useState("");
  const last = useRef({ code: "", t: 0 });

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        scanner = new Html5Qrcode("pm-scanner");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 280, height: 140 } },
          (text) => {
            const now = Date.now();
            if (last.current.code === text && now - last.current.t < 2500) return;
            last.current = { code: text, t: now };
            onScan(text);
            if (!continuous) onClose();
          },
          () => {},
        );
      } catch {
        setErr("No se pudo abrir la cámara. Revisa los permisos del navegador (en celular se necesita HTTPS).");
      }
    })();
    return () => {
      cancelled = true;
      scanner?.isScanning && scanner.stop().then(() => scanner?.clear()).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-bold">Escanear con la cámara</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div id="pm-scanner" className="min-h-48 bg-black" />
        {err ? <p className="p-4 text-sm text-rose-600">{err}</p> : <p className="p-3 text-center text-xs text-slate-500">Apunta al código de barras o QR del producto</p>}
      </div>
    </div>
  );
}
