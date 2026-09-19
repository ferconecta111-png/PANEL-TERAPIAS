"use client";

import { useTransition } from "react";
import { cambiarEstadoCitaAction } from "./actions";

const ESTADO_LABEL: Record<string, string> = {
  agendada: "Agendada",
  completada: "Completada",
  cancelada: "Cancelada",
  no_asistio: "No asistió",
};

export default function ListaCitas({
  citas,
  mostrarTerapeuta,
}: {
  citas: { id: string; startAt: string; estado: string; pacienteNombre: string; terapeutaNombre: string }[];
  mostrarTerapeuta: boolean;
}) {
  const [pendiente, startTransition] = useTransition();

  if (citas.length === 0) {
    return <p className="text-sm text-[var(--text-dim)]">No hay citas agendadas.</p>;
  }

  return (
    <div className="grid gap-3">
      {citas.map(c => (
        <div key={c.id} className="card flex items-center justify-between p-4">
          <div>
            <p className="font-semibold text-[var(--text)]">{c.pacienteNombre}</p>
            <p className="text-sm text-[var(--text-dim)]">
              {new Date(c.startAt).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
              {mostrarTerapeuta && ` · ${c.terapeutaNombre}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--secondary-soft)] px-3 py-1 text-xs font-medium text-[var(--text)]">
              {ESTADO_LABEL[c.estado] ?? c.estado}
            </span>
            {c.estado === "agendada" && (
              <select
                disabled={pendiente}
                defaultValue=""
                onChange={e => {
                  const valor = e.target.value as "completada" | "cancelada" | "no_asistio";
                  if (valor) startTransition(() => cambiarEstadoCitaAction(c.id, valor));
                }}
                className="input-soft text-xs"
              >
                <option value="">Marcar...</option>
                <option value="completada">Completada</option>
                <option value="no_asistio">No asistió</option>
                <option value="cancelada">Cancelada</option>
              </select>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
