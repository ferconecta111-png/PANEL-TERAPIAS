"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import type { EstadoCuenta } from "./types";

export async function cambiarContrasenaAction(_prev: EstadoCuenta, formData: FormData): Promise<EstadoCuenta> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (nueva.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres.", ok: false };
  if (nueva !== confirmacion) return { error: "Las dos contraseñas no coinciden.", ok: false };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: "No se pudo cambiar la contraseña. Vuelve a iniciar sesión e inténtalo de nuevo.", ok: false };

  return { error: null, ok: true };
}
