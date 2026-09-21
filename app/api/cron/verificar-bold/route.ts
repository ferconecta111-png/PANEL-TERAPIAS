import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron (cada 15 min, ver vercel.json) — revisa que la llave de identidad de
 * Bold de Elizabeth siga siendo válida. Bold la rotó sin aviso una vez
 * (21-sep-2026) y rompió en silencio la generación de links en su sitio
 * hasta que se notó a mano. Avisa por ntfy.sh SOLO en el cambio de estado
 * (sana->rota o rota->sana), nunca en cada chequeo — para no saturar de
 * notificaciones repetidas mientras sigue rota.
 */
export const runtime = "nodejs";

const ID_SALUD = "bold_identity_key_elizabeth";

async function avisar(mensaje: string, prioridad: "default" | "urgent"): Promise<void> {
  const topic = process.env.NTFY_TOPIC_ALERTAS;
  if (!topic) return;
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { Title: "Panel Terapeutas", Priority: priorityHeader(prioridad) },
      body: mensaje,
    });
  } catch {
    // Si ntfy falla, no hay más a donde avisar desde aquí — se pierde este
    // aviso puntual, pero el próximo chequeo (15 min) lo vuelve a intentar
    // si el estado sigue roto (los reintentos de "sigue roto" no avisan,
    // solo el cambio de estado, así que si este intento falla justo cuando
    // pasó de sana a rota, el aviso se pierde hasta el siguiente cambio real).
  }
}

function priorityHeader(p: "default" | "urgent"): string {
  return p === "urgent" ? "urgent" : "default";
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const identityKey = process.env.BOLD_IDENTITY_KEY_ELIZABETH ?? "";
  let ok = false;
  let detalle = "";

  if (!identityKey) {
    detalle = "Falta BOLD_IDENTITY_KEY_ELIZABETH en el entorno.";
  } else {
    try {
      const res = await fetch("https://integrations.api.bold.co/online/link/v1?page_size=1", {
        headers: { Authorization: `x-api-key ${identityKey}` },
      });
      if (res.status === 401 || res.status === 403) {
        detalle = `Bold rechazó la llave (HTTP ${res.status}) — probablemente la rotó de nuevo.`;
      } else if (!res.ok) {
        detalle = `Bold respondió HTTP ${res.status} (no es de autenticación, puede ser algo temporal de Bold).`;
      } else {
        ok = true;
      }
    } catch (err) {
      detalle = `No se pudo contactar a Bold: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  const admin = createAdminClient();
  const { data: previo } = await admin.from("salud_integraciones").select("ok").eq("id", ID_SALUD).maybeSingle();
  const cambioDeEstado = previo === null || previo.ok !== ok;

  await admin.from("salud_integraciones").upsert(
    { id: ID_SALUD, ok, detalle, updated_at: new Date().toISOString() },
    { onConflict: "id" },
  );

  if (cambioDeEstado) {
    if (ok) {
      await avisar("✅ La llave de Bold de Elizabeth volvió a funcionar. Los links de pago ya generan bien.", "default");
    } else {
      await avisar(`⚠️ La llave de Bold de Elizabeth dejó de funcionar: ${detalle} Los botones de pago del sitio se van a caer al link de respaldo (puede estar agotado) hasta que se arregle.`, "urgent");
    }
  }

  return NextResponse.json({ ok, detalle, cambioDeEstado });
}
