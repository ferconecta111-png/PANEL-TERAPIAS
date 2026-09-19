"use server";

import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoCita } from "./types";

export async function agendarCitaAction(_prev: EstadoCita, formData: FormData): Promise<EstadoCita> {
  const sesion = await requireSesion();
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const fecha = String(formData.get("fecha") ?? "");
  const hora = String(formData.get("hora") ?? "");
  const duracionMin = Number(formData.get("duracionMin") ?? 60);

  if (!pacienteId) return { error: "Elige un paciente." };
  if (!fecha || !hora) return { error: "Elige fecha y hora." };

  const terapeutaId = sesion.role === "admin" ? String(formData.get("terapeutaId") ?? "") : sesion.terapeutaId;
  if (!terapeutaId) return { error: "No se pudo determinar la terapeuta." };

  const startAt = new Date(`${fecha}T${hora}:00`);
  if (Number.isNaN(startAt.getTime())) return { error: "Fecha u hora inválida." };
  const endAt = new Date(startAt.getTime() + duracionMin * 60_000);

  const admin = createAdminClient();
  const { error } = await admin.from("citas").insert({
    terapeuta_id: terapeutaId,
    paciente_id: pacienteId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  });

  if (error) {
    if (error.code === "23P01") return { error: "Ese horario ya está ocupado para esta terapeuta." };
    return { error: `No se pudo agendar: ${error.message}` };
  }

  revalidatePath("/panel/agenda");
  return { error: null };
}

export async function cambiarEstadoCitaAction(citaId: string, estado: "completada" | "cancelada" | "no_asistio"): Promise<void> {
  await requireSesion();
  const admin = createAdminClient();
  await admin.from("citas").update({ estado }).eq("id", citaId);
  revalidatePath("/panel/agenda");
}
