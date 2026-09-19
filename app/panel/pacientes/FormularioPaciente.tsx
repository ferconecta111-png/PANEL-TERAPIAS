"use client";

import { useActionState, useRef, useEffect } from "react";
import { agregarPacienteAction } from "./actions";
import { ESTADO_INICIAL_SOLICITUD } from "./types";

export default function FormularioPaciente({
  terapeutas,
  esAdmin,
}: {
  terapeutas: { id: string; nombre: string }[];
  esAdmin: boolean;
}) {
  const [estado, accion, pendiente] = useActionState(agregarPacienteAction, ESTADO_INICIAL_SOLICITUD);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-xs font-medium text-[var(--text-dim)]">Nombre</label>
        <input id="nombre" name="nombre" required className="input-soft w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="telefono" className="text-xs font-medium text-[var(--text-dim)]">Teléfono</label>
        <input id="telefono" name="telefono" className="input-soft w-40" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium text-[var(--text-dim)]">Correo</label>
        <input id="email" name="email" type="email" className="input-soft w-48" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="producto" className="text-xs font-medium text-[var(--text-dim)]">Producto</label>
        <input id="producto" name="producto" className="input-soft w-40" placeholder="Sesión / Paquete" />
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
      <button type="submit" disabled={pendiente} className="btn-accent disabled:opacity-60">
        {pendiente ? "Guardando..." : "Agregar"}
      </button>
      {estado.error && <p role="alert" className="w-full text-sm font-medium text-[var(--danger)]">{estado.error}</p>}
    </form>
  );
}
