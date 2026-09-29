"use server";

import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoHorario } from "./types";

export async function agregarHorarioAction(_prev: EstadoHorario, formData: FormData): Promise<EstadoHorario> {
  const sesion = await requireSesion();
  const diaSemana = Number(formData.get("diaSemana"));
  const horaInicio = String(formData.get("horaInicio") ?? "");
  const horaFin = String(formData.get("horaFin") ?? "");

  const terapeutaId = sesion.role === "admin" ? String(formData.get("terapeutaId") ?? "") : sesion.terapeutaId;
  if (!terapeutaId) return { error: "No se pudo determinar la terapeuta." };
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) return { error: "Elige un día válido." };
  if (!horaInicio || !horaFin) return { error: "Elige hora de inicio y de fin." };
  if (horaInicio >= horaFin) return { error: "La hora de inicio debe ser antes que la de fin." };

  const admin = createAdminClient();
  const { error } = await admin.from("horarios_terapeuta").insert({
    terapeuta_id: terapeutaId,
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
  });
  if (error) return { error: "No se pudo guardar el horario." };

  revalidatePath("/panel/horario");
  return { error: null };
}

export async function eliminarHorarioAction(horarioId: string): Promise<void> {
  await requireSesion();
  const admin = createAdminClient();
  await admin.from("horarios_terapeuta").delete().eq("id", horarioId);
  revalidatePath("/panel/horario");
}
