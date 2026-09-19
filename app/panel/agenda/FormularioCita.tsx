"use client";

import { useActionState, useRef, useEffect } from "react";
import { agendarCitaAction } from "./actions";
import { ESTADO_INICIAL_CITA } from "./types";

export default function FormularioCita({
  pacientes,
  terapeutas,
  esAdmin,
}: {
  pacientes: { id: string; nombre: string }[];
  terapeutas: { id: string; nombre: string }[];
  esAdmin: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(agendarCitaAction, ESTADO_INICIAL_CITA);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!estado.error) formRef.current?.reset();
  }, [estado.error]);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="pacienteId" className="text-xs font-medium text-[var(--text-dim)]">Paciente</label>
        <select id="pacienteId" name="pacienteId" required className="input-soft w-48">
          <option value="">Elegir...</option>
          {pacientes.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
      </div>
      {esAdmin && (
        <div className="flex flex-col gap-1">
          <label htmlFor="terapeutaId" className="text-xs font-medium text-[var(--text-dim)]">Terapeuta</label>
          <select id="terapeutaId" name="terapeutaId" required className="input-soft w-48">
            <option value="">Elegir...</option>
            {terapeutas.map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <label htmlFor="fecha" className="text-xs font-medium text-[var(--text-dim)]">Fecha</label>
        <input id="fecha" name="fecha" type="date" required className="input-soft" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="hora" className="text-xs font-medium text-[var(--text-dim)]">Hora</label>
        <input id="hora" name="hora" type="time" required className="input-soft" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="duracionMin" className="text-xs font-medium text-[var(--text-dim)]">Duración (min)</label>
        <input id="duracionMin" name="duracionMin" type="number" defaultValue={60} min={15} step={15} className="input-soft w-28" />
      </div>
      <button type="submit" disabled={pendiente} className="btn-accent disabled:opacity-60">
        {pendiente ? "Agendando..." : "Agendar"}
      </button>
      {estado.error && <p role="alert" className="w-full text-sm font-medium text-[var(--danger)]">{estado.error}</p>}
    </form>
  );
}
