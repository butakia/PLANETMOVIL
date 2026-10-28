"use client";
import { Delete } from "lucide-react";

/** Teclado numérico en pantalla: solo dígitos, pensado para código interno o IMEI. */
export default function NumPad({ value, onChange, onEnter, enterLabel = "Buscar" }: {
  value: string; onChange: (v: string) => void; onEnter: () => void; enterLabel?: string;
}) {
  const key = "lift flex h-14 items-center justify-center rounded-2xl border border-slate-100 bg-white text-2xl font-extrabold text-slate-800 shadow-sm active:scale-95 active:bg-slate-100 sm:h-16";
  return (
    <div className="mx-auto mt-4 w-full max-w-xs select-none">
      <div className="grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={key} onClick={() => onChange(value + d)}>{d}</button>
        ))}
        <button type="button" className={`${key} !text-base !text-slate-500`} onClick={() => onChange("")}>Borrar</button>
        <button type="button" className={key} onClick={() => onChange(value + "0")}>0</button>
        <button type="button" className={`${key} !text-slate-500`} aria-label="Borrar un dígito" onClick={() => onChange(value.slice(0, -1))}><Delete className="h-6 w-6" /></button>
      </div>
      <button type="button" onClick={onEnter} className="btn-primary mt-3 w-full py-4 text-base">{enterLabel}</button>
    </div>
  );
}
