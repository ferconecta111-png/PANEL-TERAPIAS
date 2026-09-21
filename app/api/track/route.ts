import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, rateLimitResponse, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/track — endpoint publico (sin auth) para las paginas de las
 * terapeutas (Elizabeth, Adriana, etc.). CORS abierto a proposito: estas
 * paginas viven en dominios propios distintos al del panel.
 */

export const runtime = "nodejs";

const TIPOS_VALIDOS = new Set(["vista", "scroll_25", "scroll_50", "scroll_75", "scroll_100", "click_compra"]);

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
  const limited = checkRateLimit("track", ip);
  if (!limited.allowed) return conCors(rateLimitResponse(limited));

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return conCors(NextResponse.json({ error: "JSON inválido" }, { status: 400 }));
  }

  const { sitioSlug, sessionId, tipo, etiqueta, pagina } = (body ?? {}) as Record<string, unknown>;

  if (typeof sitioSlug !== "string" || sitioSlug.length < 2 || sitioSlug.length > 40) {
    return conCors(NextResponse.json({ error: "sitioSlug inválido" }, { status: 422 }));
  }
  if (typeof sessionId !== "string" || sessionId.length < 8 || sessionId.length > 80) {
    return conCors(NextResponse.json({ error: "sessionId inválido" }, { status: 422 }));
  }
  if (typeof tipo !== "string" || !TIPOS_VALIDOS.has(tipo)) {
    return conCors(NextResponse.json({ error: "tipo inválido" }, { status: 422 }));
  }

  const admin = createAdminClient();
  const { error } = await admin.from("eventos_pagina").insert({
    sitio_slug: sitioSlug,
    session_id: sessionId,
    tipo,
    etiqueta: typeof etiqueta === "string" ? etiqueta.slice(0, 60) : null,
    pagina: typeof pagina === "string" ? pagina.slice(0, 200) : null,
    referrer: req.headers.get("referer")?.slice(0, 200) ?? null,
    user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
  });

  // Nunca revienta la pagina de la terapeuta por un fallo aqui — fire-and-forget en la practica.
  if (error) console.error("[track] insert_fallido", { code: error.code });

  return conCors(NextResponse.json({ ok: true }));
}
