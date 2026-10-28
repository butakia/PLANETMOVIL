"use client";
import { useEffect, useState } from "react";

export type Service = { technician: string; detail: string };

/** Servicio técnico: solo nombre del técnico y detalle, ambos obligatorios. */
export default function ServiceFields({ onChange }: { onChange: (s: Service) => void }) {
  const [technician, setTechnician] = useState("");
  const [detail, setDetail] = useState("");
  useEffect(() => { onChange({ technician, detail }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [technician, detail]);
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
    </div>
  );
}
