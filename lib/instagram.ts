/**
 * "Respuesta privada" de Instagram: manda un DM a quien comentó, citando su
 * comentario como entrada — es la función exacta que ManyChat vende como
 * "comentario -> DM automático", solo que vía la API de Meta directo, sin
 * mensualidad. Meta la permite sin el límite de 24h normal de mensajería
 * porque el DM nace de una acción del usuario (su propio comentario) y llega
 * dentro de los 7 días siguientes.
 *
 * Doc: https://developers.facebook.com/docs/messenger-platform/instagram/features/private-replies
 */

export interface RespuestaPrivadaResultado {
  ok: boolean;
  error?: string;
}

export async function enviarRespuestaPrivada(
  commentId: string,
  mensaje: string,
  accessToken: string,
): Promise<RespuestaPrivadaResultado> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${commentId}/private_replies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: mensaje, access_token: accessToken }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[instagram] private_reply_fallo", { commentId, status: res.status, json });
      return { ok: false, error: `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    console.error("[instagram] private_reply_error_red", { commentId, error: (error as Error).message });
    return { ok: false, error: (error as Error).message };
  }
}
