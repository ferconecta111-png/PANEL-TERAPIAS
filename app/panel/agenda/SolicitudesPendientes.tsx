"use client";

import { useState, useTransition } from "react";
import { aceptarSolicitudAction, rechazarSolicitudAction } from "./actions";

export interface SolicitudPendiente {
  id: string;
  fechaHora: string; // ya formateada en hora Colombia
  pacienteNombre: string;
  terapeutaNombre: string;
}

export default function SolicitudesPendientes({
  solicitudes,
  mostrarTerapeuta,
}: {
  solicitudes: SolicitudPendiente[];
  mostrarTerapeuta: boolean;
}) {
  const [resueltas, setResueltas] = useState<Set<string>>(new Set());
  const [linksWhatsapp, setLinksWhatsapp] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [pendiente, startTransition] = useTransition();

  const visibles = solicitudes.filter(s => !resueltas.has(s.id));
  if (visibles.length === 0) return null;

  function aceptar(id: string) {
    startTransition(async () => {
      const resultado = await aceptarSolicitudAction(id);
      if (resultado.error) {
        setErrores(prev => ({ ...prev, [id]: resultado.error! }));
        return;
      }
      setResueltas(prev => new Set(prev).add(id));
      if (resultado.linkWhatsapp) setLinksWhatsapp(prev => ({ ...prev, [id]: resultado.linkWhatsapp! }));
    });
  }

  function rechazar(id: string) {
    startTransition(async () => {
      const resultado = await rechazarSolicitudAction(id);
      if (resultado.error) {
        setErrores(prev => ({ ...prev, [id]: resultado.error! }));
        return;
      }
      setResueltas(prev => new Set(prev).add(id));
    });
  }

  return (
    <div className="mb-8 card p-5">
      <h2 className="mb-3 text-base font-semibold text-[var(--text)]">
        Solicitudes de cita pendientes ({visibles.length})
      </h2>
      <ul className="flex flex-col gap-3">
        {visibles.map(s => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
            <div className="min-w-0">
              <p className="font-semibold text-[var(--text)]">{s.pacienteNombre}</p>
              <p className="text-sm text-[var(--text-dim)]">
                {s.fechaHora}{mostrarTerapeuta ? ` · ${s.terapeutaNombre}` : ""}
              </p>
              {errores[s.id] && <p className="text-sm text-[var(--danger)]">{errores[s.id]}</p>}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pendiente}
                onClick={() => aceptar(s.id)}
                className="btn-accent px-4 py-2 text-sm disabled:opacity-60"
              >
                Aceptar
              </button>
              <button
                type="button"
                disabled={pendiente}
                onClick={() => rechazar(s.id)}
                className="rounded-[var(--r-sm)] border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] disabled:opacity-60"
              >
                Rechazar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {Object.entries(linksWhatsapp).map(([id, link]) => (
        <a
          key={id}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent mt-3 inline-block px-4 py-2 text-sm"
        >
          Enviar confirmación por WhatsApp →
        </a>
      ))}
    </div>
  );
}
