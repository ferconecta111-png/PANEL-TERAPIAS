"use client";

import { useRef, useState, useTransition } from "react";
import { agregarNotaAction } from "../actions";

export default function FormularioNota({ pacienteId, terapeutaId }: { pacienteId: string; terapeutaId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <form
      className="mb-4 flex flex-col gap-2"
      onSubmit={e => {
        e.preventDefault();
        const nota = ref.current?.value ?? "";
        startTransition(async () => {
          const resultado = await agregarNotaAction(pacienteId, terapeutaId, nota);
          setError(resultado.error);
          if (!resultado.error && ref.current) ref.current.value = "";
        });
      }}
    >
      <textarea
        ref={ref}
        rows={2}
        className="input-soft w-full resize-none"
        placeholder="¿En qué quedó esta sesión? ¿Qué seguir la próxima vez?"
      />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className="btn-accent disabled:opacity-60">
          {pendiente ? "Guardando..." : "Agregar nota"}
        </button>
        {error && <p role="alert" className="text-sm font-medium text-[var(--danger)]">{error}</p>}
      </div>
    </form>
  );
}
