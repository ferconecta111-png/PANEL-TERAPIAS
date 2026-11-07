import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/public/lead-magnet — guarda el contacto que deja sus datos a
 * cambio de un regalo digital (ebook, meditación, guía) en un sitio público.
 * Mismo patrón de CORS abierto que /api/public/bold-link: estos sitios viven
 * en dominios propios distintos a este panel.
 *
 * A diferencia de bold-link, aquí no se genera nada del lado del servidor —
 * el archivo (mp3, pdf) ya vive como archivo estático en el sitio público; el
 * backend solo registra el contacto y devuelve a dónde mandar a la persona
 * (la página de gracias con la entrega), para que el catálogo de productos
 * no quede repetido entre el sitio estático y este servidor.
 */
export const runtime = "nodejs";

interface ProductoLeadMagnet {
  slug: string; // terapeutas.slug
  redirectUrl: string;
}

const CATALOGO: Record<string, ProductoLeadMagnet> = {
  adriana_meditacion_chakra_raiz: {
    slug: "adriana",
    redirectUrl: "https://ferconecta111-png.github.io/PAGINA-WEB-ADRIANA-VARGAS/gracias-meditacion.html",
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

function esEmailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limited = checkRateLimit("lead-magnet", ip);
  if (!limited.allowed) return conCors(rateLimitResponse(limited));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return conCors(NextResponse.json({ error: "JSON inválido" }, { status: 400 }));
  }

  const { producto, nombre, email, whatsapp, pais } = body as {
    producto?: unknown;
    nombre?: unknown;
    email?: unknown;
    whatsapp?: unknown;
    pais?: unknown;
  };

  const config = typeof producto === "string" ? CATALOGO[producto] : undefined;
  if (!config) return conCors(NextResponse.json({ error: "Producto desconocido" }, { status: 422 }));

  const nombreTexto = typeof nombre === "string" ? nombre.trim().slice(0, 150) : "";
  const emailTexto = typeof email === "string" ? email.trim().toLowerCase().slice(0, 200) : "";
  const whatsappTexto = typeof whatsapp === "string" ? whatsapp.trim().slice(0, 30) : "";
  const paisTexto = typeof pais === "string" ? pais.trim().slice(0, 60) : null;

  if (!nombreTexto || !esEmailValido(emailTexto)) {
    return conCors(NextResponse.json({ error: "Falta nombre o el correo no es válido" }, { status: 422 }));
  }

  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id")
    .eq("slug", config.slug)
    .maybeSingle<{ id: string }>();

  const { error } = await admin.from("leads_magnet").insert({
    terapeuta_id: terapeuta?.id ?? null,
    producto,
    nombre: nombreTexto,
    email: emailTexto,
    whatsapp: whatsappTexto || null,
    pais: paisTexto,
  });

  // Best-effort: si guardar el lead falla, igual la dejamos pasar a la
  // entrega del regalo — no castigar a la visitante por un error nuestro.
  // El dato se pierde, pero eso ya quedará en los logs para revisar.
  if (error) console.error("[lead-magnet] no_se_guardo", { producto, code: error.code });

  return conCors(NextResponse.json({ ok: true, redirectUrl: config.redirectUrl }));
}
