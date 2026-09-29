"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { huecosDisponibles, localAUtc, DURACION_MIN } from "@/lib/agendamiento/disponibilidad";
import type { EstadoSolicitudCita } from "./types";

export async function solicitarCitaAction(_prev: EstadoSolicitudCita, formData: FormData): Promise<EstadoSolicitudCita> {
  const ip = getClientIp(await headers());
  const limitado = checkRateLimit("solicitud-cita", ip);
  if (!limitado.allowed) return { ok: false, error: "Demasiados intentos. Espera un minuto e intenta de nuevo." };

  const slug = String(formData.get("slug") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;

  if (!slug || !fecha || !hora) return { ok: false, error: "Falta elegir un horario." };
  if (nombre.length < 2) return { ok: false, error: "Escribe tu nombre completo." };
  if (telefono.length < 7) return { ok: false, error: "Escribe tu WhatsApp con código de país." };

  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id")
    .eq("slug", slug)
    .eq("activa", true)
    .maybeSingle<{ id: string }>();
  if (!terapeuta) return { ok: false, error: "No se pudo identificar a la terapeuta." };

  // Nunca confiar en la fecha/hora que manda el navegador sin revalidarla —
  // alguien podria mandar un POST directo con un horario fuera de su agenda.
  const huecos = await huecosDisponibles(terapeuta.id);
  const diaValido = huecos.find(h => h.fecha === fecha);
  if (!diaValido || !diaValido.slots.includes(hora)) {
    return { ok: false, error: "Ese horario ya no está disponible. Elige otro de la lista." };
  }

  const startAt = localAUtc(fecha, hora);
  const endAt = new Date(startAt.getTime() + DURACION_MIN * 60_000);

  let pacienteId: string;
  const { data: pacienteExistente } = await admin
    .from("pacientes")
    .select("id")
    .eq("terapeuta_id", terapeuta.id)
    .eq("telefono", telefono)
    .maybeSingle<{ id: string }>();

  if (pacienteExistente) {
    pacienteId = pacienteExistente.id;
  } else {
    const { data: nuevoPaciente, error: errorPaciente } = await admin
      .from("pacientes")
      .insert({ terapeuta_id: terapeuta.id, nombre, telefono, email, origen: "link_publico" })
      .select("id")
      .single<{ id: string }>();
    if (errorPaciente || !nuevoPaciente) return { ok: false, error: "No se pudo guardar tu solicitud. Intenta de nuevo." };
    pacienteId = nuevoPaciente.id;
  }

  const { error: errorSolicitud } = await admin.from("solicitudes_cita").insert({
    terapeuta_id: terapeuta.id,
    paciente_id: pacienteId,
    start_at: startAt.toISOString(),
    end_at: endAt.toISOString(),
  });

  if (errorSolicitud) {
    if (errorSolicitud.code === "23P01") {
      return { ok: false, error: "Alguien más acaba de pedir ese horario. Elige otro de la lista." };
    }
    return { ok: false, error: "No se pudo enviar tu solicitud. Intenta de nuevo." };
  }

  return { ok: true, error: null };
}
