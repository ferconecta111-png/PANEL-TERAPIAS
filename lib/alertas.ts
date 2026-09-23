import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Notificaciones push (ntfy.sh, gratis, sin cuenta) para avisarle a
 * Fernanda de fallas reales en vivo — sin esto, un botón de pago roto solo
 * se nota cuando un cliente se queja. Nunca lanza: si ntfy falla, se pierde
 * el aviso puntual, pero nunca debe tumbar el flujo real de un visitante.
 */

type Prioridad = "default" | "urgent";

export async function enviarAlerta(mensaje: string, prioridad: Prioridad = "default"): Promise<void> {
  const topic = process.env.NTFY_TOPIC_ALERTAS;
  if (!topic) return;
  try {
    await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { Title: "Panel Terapeutas", Priority: prioridad },
      body: mensaje,
    });
  } catch {
    // Nunca romper el flujo real por esto.
  }
}

/**
 * Igual que enviarAlerta, pero con "silencio" mínimo entre avisos del mismo
 * `id` — para que una racha de fallas seguidas (ej. Bold caído 10 minutos)
 * mande UN aviso, no uno por cada visitante que chocó contra el error.
 * Usa `salud_integraciones` (misma tabla del cron de Bold) como reloj
 * compartido entre invocaciones serverless (no hay memoria persistente).
 */
export async function avisarConDebounce(
  id: string,
  mensaje: string,
  prioridad: Prioridad,
  minutosMinimosEntreAvisos: number,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("salud_integraciones").select("updated_at").eq("id", id).maybeSingle();
    const ultimoAviso = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
    const yaPasoElSilencio = Date.now() - ultimoAviso > minutosMinimosEntreAvisos * 60_000;
    if (!yaPasoElSilencio) return;

    await admin.from("salud_integraciones").upsert(
      { id, ok: false, detalle: mensaje, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    await enviarAlerta(mensaje, prioridad);
  } catch {
    // Si el debounce falla (ej. Supabase caído también), mejor avisar de
    // más que quedarse callado del todo.
    await enviarAlerta(mensaje, prioridad);
  }
}
