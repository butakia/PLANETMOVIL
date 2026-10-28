"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Delete } from "lucide-react";

/**
 * Campo numérico que NO abre el teclado del celular: al tocarlo sale un teclado de solo números en pantalla.
 * decimal = permite un punto (montos). Sin decimal solo dígitos (DNI, celular, cantidades).
 */
export default function NumInput({ value, onChange, decimal = false, placeholder = "0", className = "input", title = "Escribe el número", prefix, maxLen = 12, big = false, onDone, autoOpen = false }: {
  value: string; onChange: (v: string) => void; decimal?: boolean; placeholder?: string; className?: string; title?: string; prefix?: string; maxLen?: number; big?: boolean; onDone?: () => void; autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const close = () => { setOpen(false); onDone?.(); };
  const press = (k: string) => {
    if (k === "." && (!decimal || value.includes("."))) return;
    if (value.length >= maxLen) return;
    if (k === "." && value === "") return onChange("0.");
    const dot = value.indexOf(".");
    if (dot >= 0 && value.length - dot > 2) return; // máximo 2 decimales
    onChange(value + k);
  };
  const key = "flex h-16 items-center justify-center rounded-2xl border border-slate-100 bg-white text-3xl font-extrabold text-slate-800 shadow-sm active:scale-95 active:bg-slate-100";

  return (
    <>
      <div role="button" tabIndex={0} onClick={() => setOpen(true)} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className={`${className} flex cursor-pointer items-center ${big ? "text-2xl font-extrabold" : ""} ${value ? "" : "!text-slate-300"}`}>
        {prefix && <span className="mr-1.5 text-slate-400">{prefix}</span>}{value || placeholder}
      </div>
      {open && mounted && createPortal(
        <div className="anim-fade fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/60 sm:items-center" onClick={close}>
          <div className="anim-sheet w-full max-w-sm select-none rounded-t-3xl bg-slate-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 text-center text-xs font-bold uppercase tracking-wide text-slate-400">{title}</div>
            <div className="mb-3 truncate rounded-2xl bg-white py-3 text-center text-4xl font-extrabold tabular-nums text-slate-800 shadow-inner">{prefix ? <span className="mr-1 text-slate-400">{prefix}</span> : null}{value || <span className="text-slate-300">{placeholder}</span>}</div>
            <div className="grid grid-cols-3 gap-2.5">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => <button key={d} type="button" className={key} onClick={() => press(d)}>{d}</button>)}
              {decimal ? <button type="button" className={key} onClick={() => press(".")}>.</button> : <button type="button" className={`${key} !text-base !text-slate-500`} onClick={() => onChange("")}>Borrar</button>}
              <button type="button" className={key} onClick={() => press("0")}>0</button>
              <button type="button" className={`${key} !text-slate-500`} aria-label="Borrar un dígito" onClick={() => onChange(value.slice(0, -1))}><Delete className="h-7 w-7" /></button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {decimal && <button type="button" className="btn-ghost py-4 text-base" onClick={() => onChange("")}>Borrar todo</button>}
              <button type="button" className={`btn-primary py-4 text-base ${decimal ? "col-span-2" : "col-span-3"}`} onClick={close}>Listo</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
