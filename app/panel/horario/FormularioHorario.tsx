"use client";

import { useActionState } from "react";
import { agregarHorarioAction, eliminarHorarioAction } from "./actions";
import { ESTADO_HORARIO_INICIAL } from "./types";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface HorarioFila {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export default function FormularioHorario({ horarios, terapeutaId }: { horarios: HorarioFila[]; terapeutaId?: string }) {
  const [estado, accion, pendiente] = useActionState(agregarHorarioAction, ESTADO_HORARIO_INICIAL);
  const porDia = new Map<number, HorarioFila[]>();
  for (const h of horarios) {
    if (!porDia.has(h.diaSemana)) porDia.set(h.diaSemana, []);
    porDia.get(h.diaSemana)!.push(h);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3">
        {DIAS.map((nombre, dia) => (
          <div key={dia} className="rounded-xl border border-[var(--border)] p-3">
            <p className="mb-2 text-sm font-semibold text-[var(--text)]">{nombre}</p>
            <div className="flex flex-wrap gap-2">
              {(porDia.get(dia) ?? []).map(h => (
                <span key={h.id} className="flex items-center gap-2 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium text-[var(--text-dim)]">
                  {h.horaInicio.slice(0, 5)}–{h.horaFin.slice(0, 5)}
                  <button
                    type="button"
                    onClick={() => eliminarHorarioAction(h.id)}
                    aria-label={`Quitar horario ${nombre} ${h.horaInicio.slice(0, 5)}-${h.horaFin.slice(0, 5)}`}
                    className="text-[var(--danger)] hover:underline"
                  >
                    ×
                  </button>
                </span>
              ))}
              {(porDia.get(dia) ?? []).length === 0 && <span className="text-xs text-[var(--text-faint)]">Sin horario</span>}
            </div>
          </div>
        ))}
      </div>

      <form action={accion} className="card flex flex-wrap items-end gap-3 p-4">
        {terapeutaId && <input type="hidden" name="terapeutaId" value={terapeutaId} />}
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-dim)]">Día</label>
          <select name="diaSemana" className="input-soft" defaultValue="1">
            {DIAS.map((nombre, dia) => (
              <option key={dia} value={dia}>{nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-dim)]">Desde</label>
          <input type="time" name="horaInicio" required className="input-soft" defaultValue="09:00" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-dim)]">Hasta</label>
          <input type="time" name="horaFin" required className="input-soft" defaultValue="17:00" />
        </div>
        <button type="submit" disabled={pendiente} className="btn-accent px-4 py-2 text-sm disabled:opacity-60">
          {pendiente ? "Guardando..." : "Agregar"}
        </button>
        {estado.error && <p className="w-full text-sm text-[var(--danger)]">{estado.error}</p>}
      </form>
      <p className="text-xs text-[var(--text-faint)]">Todas las horas son en horario de Colombia (Bogotá).</p>
    </div>
  );
}
