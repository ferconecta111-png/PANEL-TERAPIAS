/**
 * Integración con PayPal Orders API v2 — respaldo para cuando Bold rechaza
 * una tarjeta internacional (hallazgo real, 22-sep-2026: Bold aprueba
 * Colombia/USA/Venezuela razonablemente bien, el resto del mundo es más
 * disparejo). Cada terapeuta usa SU PROPIA cuenta de PayPal.
 * Doc: https://developer.paypal.com/docs/api/orders/v2/
 */

const PAYPAL_API = "https://api-m.paypal.com";

export interface CrearOrdenInput {
  clientId: string;
  secret: string;
  montoUsd: number;
  descripcion: string;
  referencia: string; // custom_id — para casar con solicitudes_pago al capturar
  returnUrl: string;
  cancelUrl: string;
}

export interface PaypalOrdenResult {
  ok: boolean;
  orderId?: string;
  url?: string; // link "approve" al que se manda al comprador
  error?: string;
}

async function obtenerToken(clientId: string, secret: string): Promise<string | null> {
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json().catch(() => null);
  return res.ok ? (data?.access_token ?? null) : null;
}

export async function crearOrden(input: CrearOrdenInput): Promise<PaypalOrdenResult> {
  const token = await obtenerToken(input.clientId, input.secret);
  if (!token) return { ok: false, error: "No se pudo autenticar con PayPal" };

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: input.referencia,
          description: input.descripcion,
          amount: { currency_code: "USD", value: input.montoUsd.toFixed(2) },
        },
      ],
      // Pedido de Fernanda (23-sep-2026): manda directo al formulario de
      // pago con tarjeta (invitado), sin pedir iniciar sesión de PayPal.
      // OJO: "landing_page" en application_context (forma vieja) quedaba
      // ignorado — la forma que PayPal sí respeta hoy va anidada en
      // payment_source.paypal.experience_context.
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Elizabet Garcia Duque",
            user_action: "PAY_NOW",
            landing_page: "GUEST_CHECKOUT",
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl,
          },
        },
      },
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok || !data?.id) {
    return { ok: false, error: data?.message ?? `PayPal respondió ${res.status}` };
  }
  // Con payment_source.paypal explícito, PayPal a veces nombra el link
  // "payer-action" en vez de "approve" — se aceptan los dos.
  const approve = (data.links as { rel: string; href: string }[] | undefined)?.find(
    l => l.rel === "approve" || l.rel === "payer-action",
  );
  if (!approve) return { ok: false, error: "PayPal no devolvió link de aprobación" };

  return { ok: true, orderId: data.id, url: approve.href };
}

export interface CapturarOrdenResult {
  ok: boolean;
  estado: "aprobado" | "rechazado";
  monto?: number;
  moneda?: string;
  payerEmail?: string;
  payerNombre?: string;
  captureId?: string;
  error?: string;
}

export async function capturarOrden(clientId: string, secret: string, orderId: string): Promise<CapturarOrdenResult> {
  const token = await obtenerToken(clientId, secret);
  if (!token) return { ok: false, estado: "rechazado", error: "No se pudo autenticar con PayPal" };

  const res = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await res.json().catch(() => null);

  const capture = data?.purchase_units?.[0]?.payments?.captures?.[0];
  const status = capture?.status ?? data?.status;
  if (!res.ok || status !== "COMPLETED") {
    return { ok: false, estado: "rechazado", error: data?.message ?? status ?? `PayPal respondió ${res.status}` };
  }

  return {
    ok: true,
    estado: "aprobado",
    monto: capture?.amount?.value ? Number(capture.amount.value) : undefined,
    moneda: capture?.amount?.currency_code,
    payerEmail: data?.payer?.email_address,
    payerNombre: data?.payer?.name ? `${data.payer.name.given_name ?? ""} ${data.payer.name.surname ?? ""}`.trim() : undefined,
    captureId: capture?.id,
  };
}
