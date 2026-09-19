"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { crearLinkDePago } from "@/lib/bold";
import type { EstadoSolicitud } from "./types";

export async function agregarPacienteAction(_prev: EstadoSolicitud, formData: FormData): Promise<EstadoSolicitud> {
  const sesion = await requireSesion();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;
  const producto = String(formData.get("producto") ?? "").trim() || null;

  if (nombre.length < 2) return { ok: false, error: "Escribe el nombre del paciente.", url: null };

  const terapeutaId = sesion.role === "admin" ? String(formData.get("terapeutaId") ?? "") || null : sesion.terapeutaId;
  if (sesion.role === "admin" && !terapeutaId) return { ok: false, error: "Elige a qué terapeuta asignarlo.", url: null };

  const admin = createAdminClient();
  const { error } = await admin.from("pacientes").insert({ nombre, telefono, email, producto, terapeuta_id: terapeutaId });
  if (error) return { ok: false, error: `No se pudo guardar: ${error.message}`, url: null };

  revalidatePath("/panel/pacientes");
  return { ok: true, error: null, url: null };
}

export async function agregarNotaAction(pacienteId: string, terapeutaId: string, nota: string): Promise<{ error: string | null }> {
  await requireSesion();
  if (!nota.trim()) return { error: "La nota no puede estar vacía." };
  const admin = createAdminClient();
  const { error } = await admin.from("notas_paciente").insert({ paciente_id: pacienteId, terapeuta_id: terapeutaId, nota: nota.trim() });
  if (error) return { error: error.message };
  revalidatePath(`/panel/pacientes/${pacienteId}`);
  return { error: null };
}

export async function crearSolicitudPagoAction(_prev: EstadoSolicitud, formData: FormData): Promise<EstadoSolicitud> {
  const sesion = await requireSesion();
  const pacienteId = String(formData.get("pacienteId") ?? "");
  const producto = String(formData.get("producto") ?? "").trim();
  const montoRaw = String(formData.get("monto") ?? "").trim();
  const monto = Number(montoRaw);

  if (!pacienteId) return { ok: false, error: "Falta el paciente.", url: null };
  if (!Number.isFinite(monto) || monto <= 0) return { ok: false, error: "El monto debe ser un número positivo.", url: null };

  const admin = createAdminClient();

  const terapeutaId = sesion.role === "admin"
    ? String(formData.get("terapeutaId") ?? "")
    : sesion.terapeutaId;
  if (!terapeutaId) return { ok: false, error: "No se pudo determinar la terapeuta.", url: null };

  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("bold_identity_key")
    .eq("id", terapeutaId)
    .maybeSingle<{ bold_identity_key: string | null }>();
  if (!terapeuta?.bold_identity_key) {
    return { ok: false, error: "Esta terapeuta todavía no tiene conectada su cuenta de Bold.", url: null };
  }

  const referencia = `sol_${randomBytes(6).toString("hex")}`;

  const resultado = await crearLinkDePago({
    identityKey: terapeuta.bold_identity_key,
    montoUnidades: monto,
    moneda: "COP",
    descripcion: producto || "Sesión de terapia",
    referencia,
  });
  if (!resultado.ok) return { ok: false, error: `Bold rechazó la solicitud: ${resultado.error}`, url: null };

  const { error: errorInsert } = await admin.from("solicitudes_pago").insert({
    referencia,
    terapeuta_id: terapeutaId,
    paciente_id: pacienteId,
    producto,
    monto,
    moneda: "COP",
    bold_payment_link_id: resultado.paymentLinkId,
    url_pago: resultado.url,
  });
  if (errorInsert) return { ok: false, error: `No se pudo guardar la solicitud: ${errorInsert.message}`, url: null };

  revalidatePath("/panel/pacientes");
  return { ok: true, error: null, url: resultado.url ?? null };
}
