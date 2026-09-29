import type { Metadata } from "next";
import { requireSesion } from "@/lib/auth";
import FormularioContrasena from "./FormularioContrasena";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const sesion = await requireSesion();

  return (
    <div className="mx-auto w-full max-w-[700px] p-4 md:p-8">
      <h1 className="t-title mb-1">Mi cuenta</h1>
      <p className="mb-6 text-sm text-[var(--text-dim)]">Sesión iniciada como {sesion.email}.</p>
      <FormularioContrasena />
    </div>
  );
}
