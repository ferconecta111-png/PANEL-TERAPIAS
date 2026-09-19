"use client";

import { useActionState } from "react";
import { iniciarSesionAction } from "./actions";
import { ESTADO_INICIAL } from "./types";

export default function LoginPage() {
  const [estado, accion, pendiente] = useActionState(iniciarSesionAction, ESTADO_INICIAL);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-display mb-1 text-2xl font-semibold text-[var(--text)]">Panel de Terapeutas</h1>
        <p className="mb-6 text-sm text-[var(--text-dim)]">Inicia sesión para continuar.</p>

        <form action={accion} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-soft w-full"
              placeholder="tucorreo@ejemplo.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-[var(--text)]">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
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
            {pendiente ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
