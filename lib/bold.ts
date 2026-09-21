/**
 * Integración con la API de Bold (Colombia) — un link de pago por solicitud.
 * Cada terapeuta usa SU PROPIA llave de identidad (su propia cuenta de Bold),
 * nunca una compartida. Doc: https://developers.bold.co/pagos-en-linea/api-link-de-pagos
 */

const BOLD_API = "https://integrations.api.bold.co/online/link/v1";

export interface CrearLinkInput {
  identityKey: string;
  /**
   * OJO (hallazgo real, 19-sep-2026): la documentación de Bold dice
   * "total_amount en centavos", pero probado contra la API real, un link en
   * USD con total_amount=7500 cobró literalmente $7,500 USD (no $75) — para
   * USD el monto va TAL CUAL en dólares enteros, no multiplicado por 100.
   * No confirmado si COP tiene el mismo comportamiento — verificar con un
   * link de prueba antes de asumir para esa moneda.
   */
  montoUnidades: number;
  moneda: "COP" | "USD";
  descripcion: string;
  referencia: string; // max 60 caracteres alfanumericos/guiones - id corto de solicitudes_pago
  /** A dónde redirige Bold tras el pago (ej. página de gracias). Opcional. */
  callbackUrl?: string;
}

export interface BoldLinkResult {
  ok: boolean;
  paymentLinkId?: string;
  url?: string;
  error?: string;
}

export async function crearLinkDePago(input: CrearLinkInput): Promise<BoldLinkResult> {
  const res = await fetch(BOLD_API, {
    method: "POST",
    headers: {
      Authorization: `x-api-key ${input.identityKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount_type: "CLOSE",
      amount: { currency: input.moneda, total_amount: input.montoUnidades, tip_amount: 0 },
      description: input.descripcion,
      reference: input.referencia,
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.payload?.url) {
    return { ok: false, error: data?.message ?? `Bold respondió ${res.status}` };
  }
  return { ok: true, paymentLinkId: data.payload.payment_link, url: data.payload.url };
}
