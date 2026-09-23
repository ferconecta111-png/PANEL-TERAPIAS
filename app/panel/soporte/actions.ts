"use server";

import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EstadoCaso {
  ok: boolean;
  error: string | null;
}

export const ESTADO_INICIAL_CASO: EstadoCaso = { ok: false, error: null };

export async function crearCasoAction(_prev: EstadoCaso, formData: FormData): Promise<EstadoCaso> {
  const sesion = await requireSesion();
  const titulo = String(formData.get("titulo") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const pacienteIdRaw = String(formData.get("pacienteId") ?? "").trim();
  const pacienteId = pacienteIdRaw || null;

  if (!titulo) return { ok: false, error: "Falta el título del caso." };

  const admin = createAdminClient();

  const terapeutaId = sesion.role === "admin"
    ? String(formData.get("terapeutaId") ?? "").trim()
    : sesion.terapeutaId;
  if (!terapeutaId) return { ok: false, error: "Falta elegir la terapeuta." };

  const { error } = await admin.from("casos_soporte").insert({
    terapeuta_id: terapeutaId,
    paciente_id: pacienteId,
    titulo,
    descripcion: descripcion || null,
    creado_por: sesion.userId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/panel/soporte");
  return { ok: true, error: null };
}

export async function cambiarEstadoCasoAction(
  casoId: string,
  estado: "abierto" | "en_proceso" | "cerrado",
): Promise<{ error: string | null }> {
  await requireSesion();
  const admin = createAdminClient();
  const { error } = await admin
    .from("casos_soporte")
    .update({ estado, cerrado_at: estado === "cerrado" ? new Date().toISOString() : null })
    .eq("id", casoId);
  if (error) return { error: error.message };
  revalidatePath("/panel/soporte");
  return { error: null };
}
