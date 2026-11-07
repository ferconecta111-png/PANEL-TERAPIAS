import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarRespuestaPrivada } from "@/lib/instagram";

/**
 * Webhook de Instagram — reemplaza a ManyChat para "comentó -> le mandamos
 * un DM con el regalo": Meta avisa aquí cada comentario nuevo en la cuenta,
 * se busca la automatización de esa cuenta (ig_automatizaciones), y si el
 * comentario trae alguna de sus palabras clave (o si no tiene ninguna
 * configurada — entonces dispara con cualquier comentario), se le contesta
 * por DM con enviarRespuestaPrivada.
 *
 * Meta exige responder RÁPIDO (si no, reintenta el mismo evento y puede
 * terminar desactivando el webhook) — todo lo que pega a la red (Supabase,
 * Graph API) va en after(), nunca bloqueando el 200 de vuelta.
 */
export const runtime = "nodejs";

function firmaValida(cuerpoCrudo: string, firmaRecibida: string | null, secreto: string): boolean {
  if (!firmaRecibida) return false;
  const esperada = "sha256=" + createHmac("sha256", secreto).update(cuerpoCrudo, "utf8").digest("hex");
  const a = Buffer.from(firmaRecibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Verificación inicial que Meta hace UNA vez al registrar el webhook en su
// panel de desarrolladores (Webhooks -> Instagram -> Verify and save).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const modo = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const esperado = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN;
  if (modo === "subscribe" && esperado && token === esperado && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verificación fallida" }, { status: 403 });
}

interface CambioComentario {
  field?: string;
  value?: {
    id?: string; // id del comentario
    text?: string;
    from?: { id?: string; username?: string };
    media?: { id?: string };
  };
}

interface EntradaWebhook {
  id?: string; // Instagram Business Account ID de quien RECIBIÓ el comentario
  time?: number;
  changes?: CambioComentario[];
}

export async function POST(req: NextRequest) {
  const cuerpoCrudo = await req.text();

  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  if (appSecret) {
    const firma = req.headers.get("x-hub-signature-256");
    if (!firmaValida(cuerpoCrudo, firma, appSecret)) {
      console.error("[webhook/instagram] firma_invalida");
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  } else {
    // Bootstrapping: todavía no se configuró INSTAGRAM_APP_SECRET en Vercel.
    // Se deja pasar para no bloquear la primera prueba, pero MUY visible en
    // logs -- esto debe quedar configurado antes de anunciar la automatización.
    console.warn("[webhook/instagram] SIN_VERIFICAR_FIRMA: falta INSTAGRAM_APP_SECRET");
  }

  let body: { entry?: EntradaWebhook[] };
  try {
    body = JSON.parse(cuerpoCrudo);
  } catch {
    return NextResponse.json({ ok: true }); // cuerpo raro: ack igual, no reintentar
  }

  // Responder 200 YA; todo el trabajo real (buscar automatización, checar
  // palabras clave, mandar el DM) ocurre después, sin bloquear a Meta.
  after(async () => {
    const admin = createAdminClient();
    for (const entrada of body.entry ?? []) {
      const igBusinessId = entrada.id;
      if (!igBusinessId) continue;

      for (const cambio of entrada.changes ?? []) {
        if (cambio.field !== "comments") continue;
        const comentario = cambio.value;
        const commentId = comentario?.id;
        const texto = (comentario?.text ?? "").toLowerCase();
        if (!commentId) continue;

        const { data: config } = await admin
          .from("ig_automatizaciones")
          .select("id, terapeuta_id, access_token, palabras_clave, mensaje, activo")
          .eq("ig_business_id", igBusinessId)
          .eq("activo", true)
          .maybeSingle<{
            id: string;
            terapeuta_id: string;
            access_token: string;
            palabras_clave: string[] | null;
            mensaje: string;
            activo: boolean;
          }>();
        if (!config) continue;

        const palabras = (config.palabras_clave ?? []).map(p => p.toLowerCase().trim()).filter(Boolean);
        const dispara = palabras.length === 0 || palabras.some(p => texto.includes(p));
        if (!dispara) continue;

        // Idempotencia: si Meta reenvía el mismo evento, el insert choca con
        // la primary key y se corta aquí -- nunca se manda el DM dos veces.
        const { error: errorDedupe } = await admin
          .from("ig_eventos_procesados")
          .insert({ comment_id: commentId, terapeuta_id: config.terapeuta_id });
        if (errorDedupe) continue; // ya procesado (o fallo real, pero mejor no repetir el DM)

        const resultado = await enviarRespuestaPrivada(commentId, config.mensaje, config.access_token);
        if (!resultado.ok) {
          console.error("[webhook/instagram] dm_no_enviado", { commentId, igBusinessId, error: resultado.error });
        }
      }
    }
  });

  return NextResponse.json({ ok: true });
}
