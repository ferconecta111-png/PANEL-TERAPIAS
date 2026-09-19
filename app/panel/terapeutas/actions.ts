"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EstadoTerapeuta } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Da de alta a una terapeuta nueva: crea su fila en `terapeutas` y le manda
 * una invitación real por correo (Supabase Auth) para que cree su propia
 * contraseña — nunca se comparte una contraseña generada aquí.
 */
export async function invitarTerapeutaAction(_prev: EstadoTerapeuta, formData: FormData): Promise<EstadoTerapeuta> {
  await requireAdmin();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim() || null;
  const comisionRaw = String(formData.get("comision") ?? "20").trim();
  const comision = Number(comisionRaw);

  if (nombre.length < 2) return { ok: false, error: "Escribe el nombre completo.", mensaje: null };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Correo inválido.", mensaje: null };
  if (!Number.isFinite(comision) || comision < 0 || comision > 100) {
    return { ok: false, error: "La comisión debe ser un número entre 0 y 100.", mensaje: null };
  }

  const admin = createAdminClient();

  const { data: existente } = await admin.from("terapeutas").select("id").eq("email", email).maybeSingle();
  if (existente) return { ok: false, error: "Ya existe una terapeuta con ese correo.", mensaje: null };

  const { data: invitada, error: errorInvite } = await admin.auth.admin.inviteUserByEmail(email);
  if (errorInvite || !invitada.user) {
    return { ok: false, error: `No se pudo enviar la invitación: ${errorInvite?.message ?? "error desconocido"}`, mensaje: null };
  }

  const { error: errorInsert } = await admin.from("terapeutas").insert({
    user_id: invitada.user.id,
    nombre,
    email,
    whatsapp,
    comision_porcentaje: comision,
  });
  if (errorInsert) return { ok: false, error: `No se pudo guardar la terapeuta: ${errorInsert.message}`, mensaje: null };

  await admin.from("profiles").upsert({ user_id: invitada.user.id, role: "terapeuta", nombre });

  revalidatePath("/panel/terapeutas");
  return { ok: true, error: null, mensaje: `Invitación enviada a ${email}.` };
}

export async function archivarTerapeutaAction(terapeutaId: string): Promise<void> {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("terapeutas").update({ activa: false, archivado_at: new Date().toISOString() }).eq("id", terapeutaId);
  revalidatePath("/panel/terapeutas");
}
