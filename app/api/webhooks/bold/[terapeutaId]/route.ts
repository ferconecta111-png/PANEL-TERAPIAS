import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/bold/[terapeutaId] — cada terapeuta registra ESTA url
 * (con su propio id) en su Panel de Comercios de Bold → Integraciones →
 * Webhooks, usando su propio secreto para firmar. Así un aviso de la cuenta
 * de Bold de una terapeuta nunca se puede hacer pasar por el de otra.
 *
 * Bold exige responder 200 en menos de 2 segundos — todo lo pesado (si algún
 * día lo hay) debe ir fire-and-forget, nunca bloqueando la respuesta.
 * Doc: https://developers.bold.co/webhook
 */

function firmaValida(cuerpoCrudo: string, firmaRecibida: string, secreto: string): boolean {
  const esperada = createHmac("sha256", secreto).update(cuerpoCrudo).digest("base64");
  const a = Buffer.from(firmaRecibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ terapeutaId: string }> }) {
  const { terapeutaId } = await params;
  const cuerpoCrudo = await req.text();
  const firma = req.headers.get("x-bold-signature") ?? "";

  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id, bold_webhook_secret")
    .eq("id", terapeutaId)
    .maybeSingle<{ id: string; bold_webhook_secret: string | null }>();

  if (!terapeuta?.bold_webhook_secret) {
    console.error("[webhook/bold] terapeuta_sin_secreto", { terapeutaId });
    return NextResponse.json({ error: "No configurado" }, { status: 404 });
  }
  if (!firma || !firmaValida(cuerpoCrudo, firma, terapeuta.bold_webhook_secret)) {
    console.error("[webhook/bold] firma_invalida", { terapeutaId });
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  interface EventoBold {
    type?: string;
    data?: {
      payment_id?: string;
      amount?: { currency?: string; total?: number };
      payer_email?: string;
      metadata?: { reference?: string };
      [campoNoDocumentado: string]: unknown;
    };
  }

  let evento: EventoBold;
  try {
    evento = JSON.parse(cuerpoCrudo);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Pedido de Fernanda (22-sep-2026): antes solo se guardaban aprobados —
  // ahora también rechazos y anulaciones aprobadas, para poder ver por qué
  // fallan los pagos y contactar a quien le rechazaron. VOID_REJECTED (un
  // intento de anular que a su vez falló) no representa un pago nuevo, se
  // ignora igual que cualquier tipo de evento que Bold agregue a futuro.
  const MAPA_ESTADO: Record<string, "aprobado" | "rechazado" | "anulado"> = {
    SALE_APPROVED: "aprobado",
    SALE_REJECTED: "rechazado",
    VOID_APPROVED: "anulado",
  };
  const estado = evento.type ? MAPA_ESTADO[evento.type] : undefined;
  if (!estado) {
    return NextResponse.json({ ok: true, ignorado: evento.type });
  }

  const datos = evento.data;
  const paymentId = datos?.payment_id;
  const referencia = datos?.metadata?.reference;
  if (!paymentId || !referencia) {
    console.error("[webhook/bold] payload_incompleto", { terapeutaId, tipo: evento.type });
    return NextResponse.json({ error: "Payload incompleto" }, { status: 400 });
  }

  // Idempotencia: Bold puede reintentar el mismo aviso hasta 5 veces.
  const { data: yaExiste } = await admin.from("pagos_bold").select("id").eq("bold_payment_id", paymentId).maybeSingle();
  if (yaExiste) return NextResponse.json({ ok: true, duplicado: true });

  const { data: solicitud } = await admin
    .from("solicitudes_pago")
    .select("paciente_id, producto")
    .eq("referencia", referencia)
    .eq("terapeuta_id", terapeutaId)
    .maybeSingle<{ paciente_id: string | null; producto: string | null }>();

  // El nombre exacto del campo de telefono en el payload real de Bold no
  // esta confirmado todavia (nunca hemos recibido uno) — se prueban los
  // nombres mas probables y si ninguno pega, queda null pero el payload
  // completo sigue en raw_payload por si hay que corregir esto despues.
  const telefono = ["payer_phone", "phone", "phone_number", "payerPhone"]
    .map(campo => datos?.[campo])
    .find((v): v is string => typeof v === "string" && v.trim().length > 0) ?? null;

  const { error } = await admin.from("pagos_bold").insert({
    terapeuta_id: terapeutaId,
    paciente_id: solicitud?.paciente_id ?? null,
    bold_payment_id: paymentId,
    monto: datos?.amount?.total ?? 0,
    moneda: datos?.amount?.currency ?? "COP",
    producto: solicitud?.producto ?? null,
    estado,
    payer_email: datos?.payer_email ?? null,
    payer_phone: telefono,
    raw_payload: evento,
  });
  if (error) {
    console.error("[webhook/bold] insert_fallido", { terapeutaId, code: error.code });
    return NextResponse.json({ error: "No se pudo guardar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
