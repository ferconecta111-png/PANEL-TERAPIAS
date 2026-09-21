import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { crearLinkDePago } from "@/lib/bold";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

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
  montoUnidades: number;
  moneda: "USD" | "COP";
  descripcion: string;
  identityKey: string;
  callbackUrl: string;
}

// Catálogo fijo v1 — cuando Elizabeth (y las demás) tengan su fila real en
// `terapeutas` con precios/identity key propios, esto se reemplaza por una
// consulta a la tabla. Por ahora, hardcoded para no bloquear el fix urgente
// del link agotándose en cada compra. La llave sale de env (no del código):
// Bold la rota de vez en cuando (pasó en vivo el 21-sep-2026, rompiendo la
// llave vieja sin aviso) y así se actualiza sin tocar código ni redeploy de
// más archivos.
function catalogo(): Record<string, ProductoPublico> {
  const identityKey = process.env.BOLD_IDENTITY_KEY_ELIZABETH ?? "";
  return {
    eli_individual: {
      montoUnidades: 75,
      moneda: "USD",
      descripcion: "Sesion individual de terapia - Elizabet Garcia Duque",
      identityKey,
      callbackUrl: "https://psicologaelizabetgarciad.com/gracias.html",
    },
    eli_paquete_x3: {
      montoUnidades: 203,
      moneda: "USD",
      descripcion: "Paquete de 3 sesiones de terapia - Elizabet Garcia Duque",
      identityKey,
      callbackUrl: "https://psicologaelizabetgarciad.com/gracias.html",
    },
  };
}

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

  const producto = (body as { producto?: unknown })?.producto;
  const config = typeof producto === "string" ? catalogo()[producto] : undefined;
  if (!config) return conCors(NextResponse.json({ error: "Producto desconocido" }, { status: 422 }));
  if (!config.identityKey) {
    console.error("[bold-link] falta_BOLD_IDENTITY_KEY_ELIZABETH");
    return conCors(NextResponse.json({ error: "Falta configurar la llave de Bold." }, { status: 500 }));
  }

  const referencia = `pub_${producto}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const resultado = await crearLinkDePago({
    identityKey: config.identityKey,
    montoUnidades: config.montoUnidades,
    moneda: config.moneda,
    descripcion: config.descripcion,
    referencia,
    callbackUrl: config.callbackUrl,
  });

  if (!resultado.ok || !resultado.url) {
    console.error("[bold-link] fallo_creacion", { producto, error: resultado.error });
    return conCors(NextResponse.json({ error: "No se pudo generar el link de pago. Intenta de nuevo." }, { status: 502 }));
  }

  return conCors(NextResponse.json({ url: resultado.url }));
}
