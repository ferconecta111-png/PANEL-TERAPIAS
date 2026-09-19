"use client";

import { useActionState } from "react";
import { crearSolicitudPagoAction } from "../actions";
import { ESTADO_INICIAL_SOLICITUD } from "../types";

export default function FormularioSolicitudPago({
  pacienteId,
  terapeutaId,
}: {
  pacienteId: string;
  terapeutaId: string;
  esAdmin: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(crearSolicitudPagoAction, ESTADO_INICIAL_SOLICITUD);

  return (
    <form action={accion} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="pacienteId" value={pacienteId} />
      <input type="hidden" name="terapeutaId" value={terapeutaId} />
      <div className="flex flex-col gap-1">
        <label htmlFor="producto" className="text-xs font-medium text-[var(--text-dim)]">Producto</label>
        <input id="producto" name="producto" className="input-soft w-48" placeholder="Sesión individual" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="monto" className="text-xs font-medium text-[var(--text-dim)]">Monto (COP)</label>
        <input id="monto" name="monto" type="number" min={1} step="1" required className="input-soft w-36" placeholder="150000" />
      </div>
      <button type="submit" disabled={pendiente} className="btn-accent disabled:opacity-60">
        {pendiente ? "Generando..." : "Generar link de pago"}
      </button>

      {estado.error && <p role="alert" className="w-full text-sm font-medium text-[var(--danger)]">{estado.error}</p>}
      {estado.url && (
        <p className="w-full text-sm font-medium text-[var(--text)]">
          Link listo:{" "}
          <a href={estado.url} target="_blank" rel="noopener" className="text-[var(--secondary)] underline">
            {estado.url}
          </a>
        </p>
      )}
    </form>
  );
}
