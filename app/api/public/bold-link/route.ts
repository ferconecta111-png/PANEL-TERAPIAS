import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { crearLinkDePago } from "@/lib/bold";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { avisarConDebounce } from "@/lib/alertas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/public/bold-link — genera un link de pago de Bold NUEVO en cada
 * llamada, para sitios públicos (Elizabeth, Adriana, etc.) cuyo botón fijo se
 * agotaba apenas alguien pagaba (los links de Bold son de un solo uso — ver
 * hallazgo real 21-sep-2026). CORS abierto a propósito: estos sitios viven en
 * dominios propios distintos al de este panel.
 *
 * El monto NUNCA lo manda el cliente — siempre sale del catálogo fijo de
 * abajo, resuelto por `producto`. Aceptar un monto del navegador abriría la
 * puerta a que cualquiera arme un link por el monto que quiera.
 */
export const runtime = "nodejs";

interface ProductoPublico {
  slug: string; // terapeutas.slug — para buscar su fila real (identity key, secreto de webhook)
  montoUnidades: number;
  moneda: "USD" | "COP";
  descripcion: string;
  callbackUrl: string;
}

// El precio/descripción de cada producto sí vive en código (es config del
// sitio público) — lo que se resuelve contra la base es la terapeuta detrás
// (slug), para que su identity key y su webhook de Bold salgan de su propia
// fila en `terapeutas` en cuanto exista, no de una env var hardcodeada.
const CATALOGO: Record<string, ProductoPublico> = {
  eli_individual: {
    slug: "elizabeth",
    montoUnidades: 75,
    moneda: "USD",
    descripcion: "Sesion individual de terapia - Elizabet Garcia Duque",
    callbackUrl: "https://psicologaelizabetgarciad.com/gracias.html",
  },
  eli_paquete_x3: {
    slug: "elizabeth",
    montoUnidades: 203,
    moneda: "USD",
    descripcion: "Paquete de 3 sesiones de terapia - Elizabet Garcia Duque",
    callbackUrl: "https://psicologaelizabetgarciad.com/gracias.html",
  },
  adriana_individual: {
    slug: "adriana",
    montoUnidades: 61,
    moneda: "USD",
    descripcion: "Sesion individual de sexologia - Adriana Vargas",
    callbackUrl: "https://ferconecta111-png.github.io/PAGINA-WEB-ADRIANA-VARGAS/gracias.html",
  },
  adriana_paquete_x3: {
    slug: "adriana",
    montoUnidades: 183,
    moneda: "USD",
    descripcion: "Paquete de 3 sesiones de sexologia - Adriana Vargas",
    callbackUrl: "https://ferconecta111-png.github.io/PAGINA-WEB-ADRIANA-VARGAS/gracias.html",
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
  const limited = checkRateLimit("bold-link", ip);
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
  // Pedido de Fernanda (22-sep-2026): nombre y teléfono son obligatorios —
  // se piden ANTES de mandar a pagar, para tener el contacto pase lo que
  // pase con el pago (Bold no lo garantiza, PayPal tampoco siempre).
  const compradorNombre = typeof nombre === "string" ? nombre.trim().slice(0, 150) : "";
  const compradorTelefono = typeof telefono === "string" ? telefono.trim().slice(0, 30) : "";
  const compradorPais = typeof pais === "string" ? pais.trim().slice(0, 60) : null;
  if (!compradorNombre || !compradorTelefono) {
    return conCors(NextResponse.json({ error: "Falta nombre o teléfono" }, { status: 422 }));
  }

  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id, bold_identity_key")
    .eq("slug", config.slug)
    .maybeSingle<{ id: string; bold_identity_key: string | null }>();

  // Sin fila real todavía: cae a la env var (mismo comportamiento que antes,
  // nunca rompe el sitio mientras se termina de dar de alta a la terapeuta).
  const identityKey = terapeuta?.bold_identity_key || process.env.BOLD_IDENTITY_KEY_ELIZABETH || "";
  if (!identityKey) {
    console.error("[bold-link] falta_identity_key", { slug: config.slug });
    await avisarConDebounce(
      "bold_link_endpoint",
      "🚨 Un visitante intentó pagar en el sitio de Elizabeth pero falta configurar la llave de Bold en el servidor.",
      "urgent",
      10,
    );
    return conCors(NextResponse.json({ error: "Falta configurar la llave de Bold." }, { status: 500 }));
  }

  const referencia = `pub_${producto}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const resultado = await crearLinkDePago({
    identityKey,
    montoUnidades: config.montoUnidades,
    moneda: config.moneda,
    descripcion: config.descripcion,
    referencia,
    callbackUrl: config.callbackUrl,
  });

  if (!resultado.ok || !resultado.url) {
    console.error("[bold-link] fallo_creacion", { producto, error: resultado.error });
    await avisarConDebounce(
      "bold_link_endpoint",
      `🚨 Un visitante intentó pagar en el sitio de Elizabeth y falló al generar el link (producto: ${producto}). Bold respondió: ${resultado.error ?? "sin detalle"}. El botón habrá caído al link de respaldo — revisa si sigue sirviendo.`,
      "urgent",
      10,
    );
    return conCors(NextResponse.json({ error: "No se pudo generar el link de pago. Intenta de nuevo." }, { status: 502 }));
  }

  // Con fila real de terapeuta: deja constancia en solicitudes_pago para que
  // el webhook de Bold (que busca por referencia + terapeuta_id) pueda
  // encontrar el producto y quede correctamente registrado en pagos_bold.
  // Sin paciente vinculado (es un comprador anónimo del sitio, no alguien ya
  // dado de alta en el CRM) — best-effort: si falla, el link ya se generó
  // bien y el pago se sigue procesando igual, solo sin este registro previo.
  if (terapeuta?.id) {
    const { error } = await admin.from("solicitudes_pago").insert({
      referencia,
      terapeuta_id: terapeuta.id,
      producto: config.descripcion,
      monto: config.montoUnidades,
      moneda: config.moneda,
      bold_payment_link_id: resultado.paymentLinkId ?? null,
      url_pago: resultado.url,
      comprador_nombre: compradorNombre,
      comprador_telefono: compradorTelefono,
      comprador_pais: compradorPais,
      pasarela: "bold",
    });
    if (error) console.error("[bold-link] solicitud_pago_no_registrada", { referencia, code: error.code });
  }

  return conCors(NextResponse.json({ url: resultado.url }));
}
