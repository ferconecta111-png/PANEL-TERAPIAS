"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { EstadoReset } from "./types";

export async function ponerContrasenaAction(_prev: EstadoReset, formData: FormData): Promise<EstadoReset> {
  const nueva = String(formData.get("nueva") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (nueva.length < 6) return { error: "La contraseña debe tener al menos 6 caracteres." };
  if (nueva !== confirmacion) return { error: "Las dos contraseñas no coinciden." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) return { error: "Este link ya venció o ya se usó. Pide uno nuevo desde 'Olvidaste tu contraseña'." };

  redirect("/panel");
}
