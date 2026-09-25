"use server";

import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoCaso } from "./types";

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

  // El selector del formulario ya solo lista pacientes propios para una
  // terapeuta, pero eso no evita que alguien mande un pacienteId ajeno a
  // mano — se valida también aquí antes de guardar (hallazgo 25-sep-2026).
  if (pacienteId) {
    const { data: paciente } = await admin.from("pacientes").select("terapeuta_id").eq("id", pacienteId).maybeSingle<{ terapeuta_id: string | null }>();
    if (!paciente || paciente.terapeuta_id !== terapeutaId) {
      return { ok: false, error: "Ese paciente no pertenece a esta terapeuta." };
    }
  }

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
  const sesion = await requireSesion();
  const admin = createAdminClient();
  // createAdminClient() se salta RLS — sin este filtro, cualquier terapeuta
  // podía cerrar/reabrir el caso de OTRA terapeuta con solo saber su id
  // (hallazgo 25-sep-2026).
  let query = admin
    .from("casos_soporte")
    .update({ estado, cerrado_at: estado === "cerrado" ? new Date().toISOString() : null })
    .eq("id", casoId);
  if (sesion.role !== "admin") {
    if (!sesion.terapeutaId) return { error: "No tienes permiso para editar este caso." };
    query = query.eq("terapeuta_id", sesion.terapeutaId);
  }
  const { data, error } = await query.select("id");
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { error: "No tienes permiso para editar este caso." };
  revalidatePath("/panel/soporte");
  return { error: null };
}
