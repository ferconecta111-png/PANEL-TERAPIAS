"use client";

import { useActionState } from "react";
import { solicitarResetAction } from "./actions";
import { ESTADO_OLVIDE_INICIAL } from "./types";

export default function FormularioOlvide({ onVolver }: { onVolver: () => void }) {
  const [estado, accion, pendiente] = useActionState(solicitarResetAction, ESTADO_OLVIDE_INICIAL);

  if (estado.enviado) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--text)]">
          Si ese correo tiene cuenta en el panel, te llegó un link para poner una contraseña nueva.
          Ábrelo desde el mismo celular o computador donde pediste el cambio.
        </p>
        <button type="button" onClick={onVolver} className="text-sm font-medium text-[var(--accent)] hover:underline">
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email-olvide" className="mb-1 block text-sm font-medium text-[var(--text)]">
          Correo
        </label>
        <input
          id="email-olvide"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-soft w-full"
          placeholder="tucorreo@ejemplo.com"
        />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm font-medium text-[var(--danger)]">
          {estado.error}
        </p>
      )}

      <button type="submit" disabled={pendiente} className="btn-accent w-full disabled:opacity-60">
        {pendiente ? "Enviando..." : "Enviarme un link por correo"}
      </button>
      <button type="button" onClick={onVolver} className="text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text)]">
        Volver a iniciar sesión
      </button>
    </form>
  );
}
