"use client";

import { useActionState } from "react";
import { cambiarContrasenaAction } from "./actions";
import { ESTADO_CUENTA_INICIAL } from "./types";

export default function FormularioContrasena() {
  const [estado, accion, pendiente] = useActionState(cambiarContrasenaAction, ESTADO_CUENTA_INICIAL);

  return (
    <form action={accion} className="card flex max-w-sm flex-col gap-4 p-6">
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
      {estado.ok && (
        <p role="status" className="text-sm font-medium text-[var(--accent)]">
          Listo, tu contraseña ya quedó actualizada.
        </p>
      )}

      <button type="submit" disabled={pendiente} className="btn-accent w-full disabled:opacity-60">
        {pendiente ? "Guardando..." : "Cambiar contraseña"}
      </button>
    </form>
  );
}
