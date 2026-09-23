import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { crearOrden } from "@/lib/paypal";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { avisarConDebounce } from "@/lib/alertas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/public/paypal-link — respaldo de /api/public/bold-link para
 * cuando Bold rechaza una tarjeta internacional (22-sep-2026). Mismo
 * catálogo fijo, mismo monto que nunca sale del navegador.
 */
export const runtime = "nodejs";

interface ProductoPublico {
  slug: string;
  montoUsd: number;
  descripcion: string;
}

const CATALOGO: Record<string, ProductoPublico> = {
  eli_individual: {
    slug: "elizabeth",
    montoUsd: 75,
    descripcion: "Sesion individual de terapia - Elizabet Garcia Duque",
  },
  eli_paquete_x3: {
    slug: "elizabeth",
    montoUsd: 203,
    descripcion: "Paquete de 3 sesiones de terapia - Elizabet Garcia Duque",
  },
};

function conCors(res: NextResponse): NextResponse {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return res;
}

export async function OPTIONS() {
  return conCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limited = checkRateLimit("paypal-link", ip);
  if (!limited.allowed) return conCors(rateLimitResponse(limited));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return conCors(NextResponse.json({ error: "JSON inválido" }, { status: 400 }));
  }

  const { producto, nombre, telefono, pais } = body as {
    producto?: unknown;
    nombre?: unknown;
    telefono?: unknown;
    pais?: unknown;
  };
  const config = typeof producto === "string" ? CATALOGO[producto] : undefined;
  if (!config) return conCors(NextResponse.json({ error: "Producto desconocido" }, { status: 422 }));

  const compradorNombre = typeof nombre === "string" ? nombre.trim().slice(0, 150) : "";
  const compradorTelefono = typeof telefono === "string" ? telefono.trim().slice(0, 30) : "";
  const compradorPais = typeof pais === "string" ? pais.trim().slice(0, 60) : null;
  if (!compradorNombre || !compradorTelefono) {
    return conCors(NextResponse.json({ error: "Falta nombre o teléfono" }, { status: 422 }));
  }

  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id")
    .eq("slug", config.slug)
    .maybeSingle<{ id: string }>();

  const clientId = process.env.PAYPAL_CLIENT_ID_ELIZABETH_LIVE ?? "";
  const secret = process.env.PAYPAL_SECRET_ELIZABETH_LIVE ?? "";
  if (!clientId || !secret) {
    console.error("[paypal-link] faltan_llaves");
    await avisarConDebounce(
      "paypal_link_endpoint",
      "🚨 Un visitante intentó pagar con PayPal en el sitio de Elizabeth pero faltan las llaves en el servidor.",
      "urgent",
      10,
    );
    return conCors(NextResponse.json({ error: "Falta configurar PayPal." }, { status: 500 }));
  }

  const referencia = `pub_${producto}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const base = "https://panel-terapeutas.vercel.app";

  const resultado = await crearOrden({
    clientId,
    secret,
    montoUsd: config.montoUsd,
    descripcion: config.descripcion,
    referencia,
    returnUrl: `${base}/api/public/paypal-capturar?referencia=${encodeURIComponent(referencia)}`,
    cancelUrl: "https://psicologaelizabetgarciad.com/",
  });

  if (!resultado.ok || !resultado.url) {
    console.error("[paypal-link] fallo_creacion", { producto, error: resultado.error });
    await avisarConDebounce(
      "paypal_link_endpoint",
      `🚨 Un visitante intentó pagar con PayPal en el sitio de Elizabeth y falló al generar la orden. PayPal respondió: ${resultado.error ?? "sin detalle"}.`,
      "urgent",
      10,
    );
    return conCors(NextResponse.json({ error: "No se pudo generar el link de pago. Intenta de nuevo." }, { status: 502 }));
  }

  if (terapeuta?.id) {
    const { error } = await admin.from("solicitudes_pago").insert({
      referencia,
      terapeuta_id: terapeuta.id,
      producto: config.descripcion,
      monto: config.montoUsd,
      moneda: "USD",
      url_pago: resultado.url,
      comprador_nombre: compradorNombre,
      comprador_telefono: compradorTelefono,
      comprador_pais: compradorPais,
      pasarela: "paypal",
    });
    if (error) console.error("[paypal-link] solicitud_pago_no_registrada", { referencia, code: error.code });
  }

  return conCors(NextResponse.json({ url: resultado.url }));
}
