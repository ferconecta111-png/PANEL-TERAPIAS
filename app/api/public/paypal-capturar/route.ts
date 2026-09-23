import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { capturarOrden } from "@/lib/paypal";
import { avisarConDebounce } from "@/lib/alertas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/public/paypal-capturar — a donde PayPal redirige al comprador
 * después de aprobar el pago (return_url). Captura la orden (cobra de
 * verdad) y de ahí sí lo manda a la página de gracias real.
 */
export const runtime = "nodejs";

const GRACIAS_URL = "https://psicologaelizabetgarciad.com/gracias.html";
const CANCELADO_URL = "https://psicologaelizabetgarciad.com/";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("token"); // PayPal manda el order id como "token"
  const referencia = req.nextUrl.searchParams.get("referencia");

  if (!orderId || !referencia) {
    return NextResponse.redirect(CANCELADO_URL);
  }

  const admin = createAdminClient();
  const { data: solicitud } = await admin
    .from("solicitudes_pago")
    .select("terapeuta_id, producto")
    .eq("referencia", referencia)
    .eq("pasarela", "paypal")
    .maybeSingle<{ terapeuta_id: string; producto: string | null }>();

  const clientId = process.env.PAYPAL_CLIENT_ID_ELIZABETH_LIVE ?? "";
  const secret = process.env.PAYPAL_SECRET_ELIZABETH_LIVE ?? "";
  if (!clientId || !secret) {
    return NextResponse.redirect(CANCELADO_URL);
  }

  const resultado = await capturarOrden(clientId, secret, orderId);

  if (solicitud?.terapeuta_id) {
    const { error } = await admin.from("pagos_paypal").insert({
      terapeuta_id: solicitud.terapeuta_id,
      paypal_order_id: orderId,
      paypal_capture_id: resultado.captureId ?? null,
      monto: resultado.monto ?? 0,
      moneda: resultado.moneda ?? "USD",
      producto: solicitud.producto,
      estado: resultado.estado,
      payer_email: resultado.payerEmail ?? null,
      payer_nombre: resultado.payerNombre ?? null,
      raw_payload: { orderId, referencia, resultado },
    });
    if (error) console.error("[paypal-capturar] pago_no_registrado", { referencia, code: error.code });
  }

  if (!resultado.ok) {
    console.error("[paypal-capturar] captura_fallida", { referencia, error: resultado.error });
    await avisarConDebounce(
      "paypal_capturar_endpoint",
      `⚠️ Un pago de PayPal en el sitio de Elizabeth no se pudo capturar (referencia ${referencia}). PayPal respondió: ${resultado.error ?? "sin detalle"}.`,
      "default",
      10,
    );
    return NextResponse.redirect(CANCELADO_URL);
  }

  return NextResponse.redirect(GRACIAS_URL);
}
