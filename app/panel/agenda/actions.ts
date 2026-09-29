"use server";

import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { localAUtc } from "@/lib/agendamiento/disponibilidad";
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

  // Bogota no tiene horario de verano, pero "14:00" escrito aqui SIEMPRE es
  // hora de Colombia — sin localAUtc, Vercel (que corre en UTC) lo guardaba
  // literal como 14:00 UTC, 5 horas adelantado de lo que se queria agendar.
  const startAt = localAUtc(fecha, hora);
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

function fmtFechaHoraBogota(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

export interface ResultadoAceptarSolicitud {
  error: string | null;
  linkWhatsapp: string | null;
}

/**
 * Acepta una solicitud publica: crea la cita real y devuelve un link de
 * WhatsApp ya redactado — el envio en si NO es automatico todavia (falta
 * conectar un canal real, correo o WhatsApp Business API), asi que la
 * terapeuta le da "enviar" con un clic desde aqui mismo.
 */
export async function aceptarSolicitudAction(solicitudId: string): Promise<ResultadoAceptarSolicitud> {
  await requireSesion();
  const admin = createAdminClient();

  const { data: solicitud } = await admin
    .from("solicitudes_cita")
    .select("terapeuta_id, paciente_id, start_at, end_at, estado")
    .eq("id", solicitudId)
    .maybeSingle<{ terapeuta_id: string; paciente_id: string; start_at: string; end_at: string; estado: string }>();
  if (!solicitud) return { error: "Esa solicitud ya no existe.", linkWhatsapp: null };
  if (solicitud.estado !== "pendiente") return { error: "Esa solicitud ya fue resuelta.", linkWhatsapp: null };

  const { data: cita, error: errorCita } = await admin
    .from("citas")
    .insert({
      terapeuta_id: solicitud.terapeuta_id,
      paciente_id: solicitud.paciente_id,
      start_at: solicitud.start_at,
      end_at: solicitud.end_at,
    })
    .select("id")
    .single<{ id: string }>();

  if (errorCita || !cita) {
    if (errorCita?.code === "23P01") return { error: "Ese horario ya tiene otra cita confirmada.", linkWhatsapp: null };
    return { error: "No se pudo confirmar la cita.", linkWhatsapp: null };
  }

  await admin.from("solicitudes_cita").update({ estado: "aceptada", cita_id: cita.id }).eq("id", solicitudId);

  const [{ data: paciente }, { data: terapeuta }] = await Promise.all([
    admin.from("pacientes").select("nombre, telefono").eq("id", solicitud.paciente_id).maybeSingle<{ nombre: string; telefono: string | null }>(),
    admin.from("terapeutas").select("nombre").eq("id", solicitud.terapeuta_id).maybeSingle<{ nombre: string }>(),
  ]);

  revalidatePath("/panel/agenda");

  if (!paciente?.telefono) return { error: null, linkWhatsapp: null };
  const numero = paciente.telefono.replace(/[^\d]/g, "");
  const mensaje = `Hola ${paciente.nombre}, soy ${terapeuta?.nombre ?? "tu terapeuta"}. Confirmo tu cita para el ${fmtFechaHoraBogota(solicitud.start_at)} (hora Colombia). ¡Nos vemos pronto!`;
  const linkWhatsapp = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  return { error: null, linkWhatsapp };
}

export async function rechazarSolicitudAction(solicitudId: string): Promise<{ error: string | null }> {
  await requireSesion();
  const admin = createAdminClient();
  const { error } = await admin
    .from("solicitudes_cita")
    .update({ estado: "rechazada" })
    .eq("id", solicitudId)
    .eq("estado", "pendiente");
  if (error) return { error: "No se pudo rechazar la solicitud." };
  revalidatePath("/panel/agenda");
  return { error: null };
}

const SITE_URL = "https://panel-terapeutas.vercel.app";

/**
 * "Rechazar con alternativa": libera la hora pedida (igual que rechazar) y
 * arma un WhatsApp ya redactado proponiendo otra hora, con el link publico
 * para que el paciente la confirme el mismo desde ahi — no creamos la cita
 * nueva nosotros, porque todavia no hay forma de saber si el paciente SI
 * puede a esa hora alternativa.
 */
export async function proponerHorarioAction(
  solicitudId: string,
  fecha: string,
  hora: string,
): Promise<ResultadoAceptarSolicitud> {
  await requireSesion();
  if (!fecha || !hora) return { error: "Elige fecha y hora para proponer.", linkWhatsapp: null };
  const admin = createAdminClient();

  const { data: solicitud } = await admin
    .from("solicitudes_cita")
    .select("terapeuta_id, paciente_id, estado")
    .eq("id", solicitudId)
    .maybeSingle<{ terapeuta_id: string; paciente_id: string; estado: string }>();
  if (!solicitud) return { error: "Esa solicitud ya no existe.", linkWhatsapp: null };
  if (solicitud.estado !== "pendiente") return { error: "Esa solicitud ya fue resuelta.", linkWhatsapp: null };

  const propuesta = localAUtc(fecha, hora);
  if (Number.isNaN(propuesta.getTime())) return { error: "Fecha u hora inválida.", linkWhatsapp: null };

  const { error } = await admin
    .from("solicitudes_cita")
    .update({ estado: "rechazada" })
    .eq("id", solicitudId)
    .eq("estado", "pendiente");
  if (error) return { error: "No se pudo actualizar la solicitud.", linkWhatsapp: null };

  const [{ data: paciente }, { data: terapeuta }] = await Promise.all([
    admin.from("pacientes").select("nombre, telefono").eq("id", solicitud.paciente_id).maybeSingle<{ nombre: string; telefono: string | null }>(),
    admin.from("terapeutas").select("nombre, slug").eq("id", solicitud.terapeuta_id).maybeSingle<{ nombre: string; slug: string | null }>(),
  ]);

  revalidatePath("/panel/agenda");

  if (!paciente?.telefono) return { error: null, linkWhatsapp: null };
  const numero = paciente.telefono.replace(/[^\d]/g, "");
  const linkAgendar = terapeuta?.slug ? ` ${SITE_URL}/agendar/${terapeuta.slug}` : "";
  const mensaje = `Hola ${paciente.nombre}, soy ${terapeuta?.nombre ?? "tu terapeuta"}. A esa hora no puedo, pero tengo libre el ${fmtFechaHoraBogota(propuesta.toISOString())} (hora Colombia). Si te sirve, confírmamela aquí:${linkAgendar}`;
  const linkWhatsapp = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  return { error: null, linkWhatsapp };
}
