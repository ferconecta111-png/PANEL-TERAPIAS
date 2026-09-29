"use client";

import { useActionState } from "react";
import { ponerContrasenaAction } from "./actions";
import { ESTADO_RESET_INICIAL } from "./types";

export default function FormularioReset() {
  const [estado, accion, pendiente] = useActionState(ponerContrasenaAction, ESTADO_RESET_INICIAL);

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div>
        <label htmlFor="nueva" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Nueva contraseña
        </label>
        <input
          id="nueva"
          name="nueva"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input-soft w-full"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label htmlFor="confirmacion" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Repite la nueva contraseña
        </label>
        <input
          id="confirmacion"
          name="confirmacion"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input-soft w-full"
          placeholder="••••••••"
        />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm font-medium text-[var(--danger)]">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={pendiente} className="btn-accent mt-2 w-full disabled:opacity-60">
        {pendiente ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
