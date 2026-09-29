import type { Metadata } from "next";
import { createSupabaseServer } from "@/lib/supabase/server";
import FormularioReset from "./FormularioReset";

export const metadata: Metadata = { title: "Nueva contraseña" };

/**
 * A donde llega el link que manda Supabase por correo (resetPasswordForEmail).
 * El "code" solo sirve UNA vez y solo funciona si se abre en el mismo
 * navegador donde se pidió el cambio (guarda el verificador en una cookie) —
 * por eso el mensaje de "Volver a intentar" cuando falla.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error: errorQuery } = await searchParams;
  let intercambioFallido = Boolean(errorQuery);

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) intercambioFallido = true;
  } else if (!errorQuery) {
    intercambioFallido = true;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <h1 className="font-display mb-1 text-2xl font-semibold text-[var(--text)]">Nueva contraseña</h1>

        {intercambioFallido ? (
          <p className="text-sm text-[var(--text-dim)]">
            Este link ya venció, ya se usó, o se abrió en un navegador distinto al que pediste el
            cambio. Vuelve a la pantalla de inicio de sesión y pide un link nuevo con
            &quot;¿Olvidaste tu contraseña?&quot;.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-[var(--text-dim)]">Escribe tu nueva contraseña.</p>
            <FormularioReset />
          </>
        )}
      </div>
    </main>
  );
}
