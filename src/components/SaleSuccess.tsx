"use client";
import { useMemo } from "react";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#facc15"];

/** Pantalla de venta confirmada: check verde animado y confeti. */
export default function SaleSuccess({ message = "¡Venta registrada!" }: { message?: string }) {
  const pieces = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      dur: 1.6 + Math.random() * 1.4,
      size: 6 + Math.random() * 7,
      color: COLORS[i % COLORS.length],
      rot: Math.random() * 360,
      drift: (Math.random() - 0.5) * 160,
      round: i % 3 === 0,
    })),
    [],
  );
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center overflow-hidden bg-white/95 backdrop-blur-sm">
      <style>{`
        @keyframes pm-fall { 0% { transform: translate3d(0,-10vh,0) rotate(0); opacity: 1 } 100% { transform: translate3d(var(--dx),110vh,0) rotate(var(--rot)); opacity: .9 } }
        @keyframes pm-pop { 0% { transform: scale(.2); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes pm-draw { to { stroke-dashoffset: 0 } }
        @keyframes pm-ring { 0% { transform: scale(.6); opacity: .6 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes pm-rise { 0% { transform: translateY(12px); opacity: 0 } 100% { transform: translateY(0); opacity: 1 } }
      `}</style>
      {pieces.map((c, i) => (
        <span key={i} className="pointer-events-none absolute top-0 block"
          style={{
            left: `${c.left}%`, width: c.size, height: c.round ? c.size : c.size * 1.7, background: c.color, borderRadius: c.round ? "50%" : 2,
            ["--dx" as string]: `${c.drift}px`, ["--rot" as string]: `${c.rot + 540}deg`,
            animation: `pm-fall ${c.dur}s ${c.delay}s cubic-bezier(.3,.6,.4,1) forwards`, opacity: 0,
          }} />
      ))}
      <div className="relative grid h-40 w-40 place-items-center">
        <span className="absolute inset-0 rounded-full bg-emerald-400/40" style={{ animation: "pm-ring .9s .25s ease-out forwards", opacity: 0 }} />
        <div className="grid h-36 w-36 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/40" style={{ animation: "pm-pop .55s cubic-bezier(.2,1.3,.4,1) forwards" }}>
          <svg viewBox="0 0 52 52" className="h-20 w-20" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 27 L23 36 L39 17" strokeDasharray="50" strokeDashoffset="50" style={{ animation: "pm-draw .45s .35s ease-out forwards" }} />
          </svg>
        </div>
      </div>
      <div className="mt-6 text-3xl font-extrabold text-emerald-700" style={{ animation: "pm-rise .4s .5s ease-out forwards", opacity: 0 }}>{message}</div>
      <div className="mt-1 text-sm font-medium text-slate-500" style={{ animation: "pm-rise .4s .7s ease-out forwards", opacity: 0 }}>Preparando el recibo…</div>
    </div>
  );
}
