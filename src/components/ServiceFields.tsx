"use client";
import { useEffect, useState } from "react";
import { limaToday } from "@/lib/format";

export type Service = { technician: string; detail: string; date: string };

/** Servicio técnico: nombre del técnico y detalle (obligatorios). La fecha puede ser anterior a hoy. */
export default function ServiceFields({ onChange }: { onChange: (s: Service) => void }) {
  const [technician, setTechnician] = useState("");
  const [detail, setDetail] = useState("");
  const [date, setDate] = useState(limaToday());
  useEffect(() => { onChange({ technician, detail, date }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [technician, detail, date]);
  const old = date && date < limaToday();
  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nombre del técnico <span className="text-rose-500">*</span></label>
        <input autoFocus className="input !py-3.5 text-lg" placeholder="Ej. Carlos" value={technician} onChange={(e) => setTechnician(e.target.value)} />
      </div>
      <div>
        <label className="label">Detalle del servicio <span className="text-rose-500">*</span></label>
        <textarea rows={3} className="input !py-3" placeholder="Ej. Cambio de pantalla Samsung A15" value={detail} onChange={(e) => setDetail(e.target.value)} />
      </div>
      <div>
        <label className="label">Fecha del servicio</label>
        <input type="date" className="input" max={limaToday()} value={date} onChange={(e) => setDate(e.target.value || limaToday())} />
        {old && <p className="mt-1 text-xs font-semibold text-amber-700">Se registrará con fecha anterior ({date.split("-").reverse().join("/")}) y se avisará al administrador.</p>}
      </div>
    </div>
  );
}
