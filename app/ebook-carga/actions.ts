"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { EstadoSolicitudEbook } from "./types";

// Mismo patrón que /guia-eli: el lead del ebook se guarda como `paciente` de
// Elizabeth (producto + origen distintos) para que aparezca en su panel real,
// en vez de vivir en una tabla aparte que nadie ve.
const SLUG_TERAPEUTA = "elizabeth";

export async function solicitarEbookAction(_prev: EstadoSolicitudEbook, formData: FormData): Promise<EstadoSolicitudEbook> {
  const ip = getClientIp(await headers());
  const limitado = checkRateLimit("solicitud-ebook-carga", ip);
  if (!limitado.allowed) return { ok: false, error: "Demasiados intentos. Espera un minuto e intenta de nuevo." };

  const nombre = String(formData.get("nombre") ?? "").trim().slice(0, 150);
  const telefono = String(formData.get("telefono") ?? "").trim().slice(0, 30);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);

  if (nombre.length < 2) return { ok: false, error: "Escribe tu nombre completo." };
  if (telefono.length < 7) return { ok: false, error: "Escribe tu WhatsApp con código de país." };
  if (!email || !email.includes("@")) return { ok: false, error: "Escribe un correo válido." };

  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id")
    .eq("slug", SLUG_TERAPEUTA)
    .eq("activa", true)
    .maybeSingle<{ id: string }>();
  if (!terapeuta) return { ok: false, error: "No se pudo procesar tu solicitud. Intenta de nuevo." };

  const { data: pacienteExistente } = await admin
    .from("pacientes")
    .select("id")
    .eq("terapeuta_id", terapeuta.id)
    .eq("telefono", telefono)
    .maybeSingle<{ id: string }>();

  if (pacienteExistente) {
    await admin.from("pacientes").update({ email }).eq("id", pacienteExistente.id);
  } else {
    const { error } = await admin.from("pacientes").insert({
      terapeuta_id: terapeuta.id,
      nombre,
      telefono,
      email,
      producto: "ebook_cuando_poder_con_todo",
      origen: "ebook_lead_magnet",
    });
    if (error) {
      console.error("[ebook-carga] paciente_no_guardado", { code: error.code });
      return { ok: false, error: "No se pudo guardar tu solicitud. Intenta de nuevo." };
    }
  }

  redirect("/ebook-carga/gracias");
}
