"use client";

import { useActionState, useRef, useEffect } from "react";
import { invitarTerapeutaAction } from "./actions";
import { ESTADO_INICIAL_TERAPEUTA } from "./types";

export default function FormularioTerapeuta() {
  const [estado, accion, pendiente] = useActionState(invitarTerapeutaAction, ESTADO_INICIAL_TERAPEUTA);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.ok) formRef.current?.reset();
  }, [estado.ok]);

  return (
    <form ref={formRef} action={accion} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-xs font-medium text-[var(--text-dim)]">Nombre completo</label>
        <input id="nombre" name="nombre" required className="input-soft w-56" placeholder="Adriana Vargas" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-xs font-medium text-[var(--text-dim)]">Correo</label>
        <input id="email" name="email" type="email" required className="input-soft w-56" placeholder="correo@ejemplo.com" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="whatsapp" className="text-xs font-medium text-[var(--text-dim)]">WhatsApp</label>
        <input id="whatsapp" name="whatsapp" className="input-soft w-40" placeholder="+57..." />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="comision" className="text-xs font-medium text-[var(--text-dim)]">Comisión %</label>
        <input id="comision" name="comision" type="number" defaultValue={20} min={0} max={100} className="input-soft w-24" />
      </div>
      <button type="submit" disabled={pendiente} className="btn-accent disabled:opacity-60">
        {pendiente ? "Enviando..." : "Invitar"}
      </button>

      {estado.error && <p role="alert" className="w-full text-sm font-medium text-[var(--danger)]">{estado.error}</p>}
      {estado.mensaje && <p className="w-full text-sm font-medium text-[var(--accent)]">{estado.mensaje}</p>}
    </form>
  );
}
