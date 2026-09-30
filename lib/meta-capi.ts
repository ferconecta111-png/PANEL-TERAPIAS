import { createHash } from "node:crypto";

/**
 * API de Conversiones de Meta — evento Purchase server-side, disparado desde
 * el webhook de Bold (ahí sí sabemos con certeza que el pago se aprobó y por
 * cuánto). Cada terapeuta usa su propio pixel + token (terapeutas.meta_pixel_id
 * / meta_capi_token) — igual patrón que su propia llave de Bold. Si a una
 * terapeuta no le hemos configurado pixel/token todavía, esta función no hace
 * nada (best-effort: nunca debe romper el registro del pago real).
 */

function sha256(valor: string): string {
  return createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

/** Telefono a solo digitos (Meta pide E.164 sin "+", hasheado). */
function normalizarTelefono(telefono: string): string {
  return telefono.replace(/[^\d]/g, "");
}

export interface DatosPurchaseCapi {
  pixelId: string;
  capiToken: string;
  montoUnidades: number;
  moneda: string;
  email?: string | null;
  telefono?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  eventSourceUrl?: string | null;
}

export async function enviarPurchaseCapi(datos: DatosPurchaseCapi): Promise<{ ok: boolean; error?: string }> {
  const userData: Record<string, unknown> = {};
  if (datos.email) userData.em = [sha256(datos.email)];
  if (datos.telefono) userData.ph = [sha256(normalizarTelefono(datos.telefono))];
  if (datos.fbp) userData.fbp = datos.fbp;
  if (datos.fbc) userData.fbc = datos.fbc;

  const evento = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: datos.eventSourceUrl || undefined,
    user_data: userData,
    custom_data: {
      value: datos.montoUnidades,
      currency: datos.moneda,
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${datos.pixelId}/events?access_token=${encodeURIComponent(datos.capiToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [evento] }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[meta-capi] error_meta", { status: res.status, json });
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error("[meta-capi] error_red", { error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}
