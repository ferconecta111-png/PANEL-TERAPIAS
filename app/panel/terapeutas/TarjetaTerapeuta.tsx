"use client";

import { useTransition } from "react";
import { archivarTerapeutaAction } from "./actions";

interface Props {
  terapeuta: {
    id: string;
    nombre: string;
    email: string;
    whatsapp: string | null;
    comision_porcentaje: number;
    activa: boolean;
  };
}

export default function TarjetaTerapeuta({ terapeuta }: Props) {
  const [pendiente, startTransition] = useTransition();

  return (
    <div className="card flex items-center justify-between p-4">
      <div>
        <p className="font-semibold text-[var(--text)]">
          {terapeuta.nombre}
          {!terapeuta.activa && (
            <span className="ml-2 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium text-[var(--text-dim)]">
              Inactiva
            </span>
          )}
        </p>
        <p className="text-sm text-[var(--text-dim)]">
          {terapeuta.email} · {terapeuta.whatsapp ?? "sin WhatsApp"} · Comisión {terapeuta.comision_porcentaje}%
        </p>
      </div>
      {terapeuta.activa && (
        <button
          type="button"
          disabled={pendiente}
          onClick={() => {
            if (confirm(`¿Archivar a ${terapeuta.nombre}? Deja de aparecer como activa.`)) {
              startTransition(() => archivarTerapeutaAction(terapeuta.id));
            }
          }}
          className="text-sm font-medium text-[var(--danger)] hover:underline disabled:opacity-60"
        >
          Archivar
        </button>
      )}
    </div>
  );
}
