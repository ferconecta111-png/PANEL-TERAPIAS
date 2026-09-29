"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { EstadoLogin, EstadoOlvide } from "./types";

const SITE_URL = "https://panel-terapeutas.vercel.app";

export async function iniciarSesionAction(_prev: EstadoLogin, formData: FormData): Promise<EstadoLogin> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Escribe tu correo y tu contraseña." };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Correo o contraseña incorrectos." };

  redirect("/panel");
}

export async function cerrarSesionAction(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * No revela si el correo existe o no (mismo mensaje en ambos casos) — evita
 * que alguien use este formulario para averiguar qué correos están dados de
 * alta. El link de verdad solo llega si el correo sí tiene cuenta.
 */
export async function solicitarResetAction(_prev: EstadoOlvide, formData: FormData): Promise<EstadoOlvide> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Escribe tu correo.", enviado: false };

  const supabase = await createSupabaseServer();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/reset-password` });

  return { error: null, enviado: true };
}
