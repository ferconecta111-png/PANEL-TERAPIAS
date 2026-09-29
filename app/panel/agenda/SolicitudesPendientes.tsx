"use client";

import { useState, useTransition } from "react";
import { aceptarSolicitudAction, rechazarSolicitudAction, proponerHorarioAction } from "./actions";

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
  const [proponiendoId, setProponiendoId] = useState<string | null>(null);
  const [fechaPropuesta, setFechaPropuesta] = useState("");
  const [horaPropuesta, setHoraPropuesta] = useState("");
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

  function confirmarPropuesta(id: string) {
    startTransition(async () => {
      const resultado = await proponerHorarioAction(id, fechaPropuesta, horaPropuesta);
      if (resultado.error) {
        setErrores(prev => ({ ...prev, [id]: resultado.error! }));
        return;
      }
      setProponiendoId(null);
      setResueltas(prev => new Set(prev).add(id));
      if (resultado.linkWhatsapp) setLinksWhatsapp(prev => ({ ...prev, [id]: resultado.linkWhatsapp! }));
    });
  }

  return (
    <div className="mb-8 card p-5">
      <h2 className="mb-3 text-base font-semibold text-[var(--text)]">
        Solicitudes de cita pendientes ({visibles.length})
      </h2>
      <ul className="flex flex-col gap-3">
        {visibles.map(s => (
          <li key={s.id} className="rounded-xl border border-[var(--border)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--text)]">{s.pacienteNombre}</p>
                <p className="text-sm text-[var(--text-dim)]">
                  {s.fechaHora}{mostrarTerapeuta ? ` · ${s.terapeutaNombre}` : ""}
                </p>
                {errores[s.id] && <p className="text-sm text-[var(--danger)]">{errores[s.id]}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
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
                  onClick={() => setProponiendoId(proponiendoId === s.id ? null : s.id)}
                  className="rounded-[var(--r-sm)] border border-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent)] hover:bg-[var(--surface-2)] disabled:opacity-60"
                >
                  Proponer otro horario
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
            </div>

            {proponiendoId === s.id && (
              <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-[var(--surface-2)] p-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-dim)]">Nueva fecha</label>
                  <input
                    type="date"
                    value={fechaPropuesta}
                    onChange={e => setFechaPropuesta(e.target.value)}
                    className="input-soft"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[var(--text-dim)]">Nueva hora</label>
                  <input
                    type="time"
                    value={horaPropuesta}
                    onChange={e => setHoraPropuesta(e.target.value)}
                    className="input-soft"
                  />
                </div>
                <button
                  type="button"
                  disabled={pendiente || !fechaPropuesta || !horaPropuesta}
                  onClick={() => confirmarPropuesta(s.id)}
                  className="btn-accent px-4 py-2 text-sm disabled:opacity-60"
                >
                  Enviar propuesta
                </button>
                <p className="w-full text-xs text-[var(--text-faint)]">
                  Hora de Colombia. Esto rechaza la hora pedida y te arma un WhatsApp con la nueva hora para que el paciente la confirme.
                </p>
              </div>
            )}
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
          Enviar por WhatsApp →
        </a>
      ))}
    </div>
  );
}
