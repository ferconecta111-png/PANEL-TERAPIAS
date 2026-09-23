import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface EventoRow {
  sitio_slug: string;
  session_id: string;
  tipo: string;
  etiqueta: string | null;
  pagina: string | null;
  created_at: string;
  country: string | null;
  user_agent: string | null;
}

const DIAS_VENTANA = 30;
const HITOS_SCROLL = [25, 50, 75, 100] as const;

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

/** Detector simple por substring — evita meter una librería para esto. */
function detectarNavegador(userAgent: string | null): string {
  if (!userAgent) return "Desconocido";
  const ua = userAgent.toLowerCase();
  if (ua.includes("instagram")) return "Instagram (in-app)";
  if (ua.includes("fbav") || ua.includes("fban")) return "Facebook (in-app)";
  if (ua.includes("edg/")) return "Edge";
  if (ua.includes("firefox")) return "Firefox";
  if (ua.includes("crios") || ua.includes("chrome")) return "Chrome";
  if (ua.includes("safari")) return "Safari";
  return "Otro";
}

const NOMBRE_PAIS: Record<string, string> = {
  MX: "México", US: "Estados Unidos", CO: "Colombia", ES: "España", HN: "Honduras",
  AR: "Argentina", CL: "Chile", PE: "Perú", EC: "Ecuador", GT: "Guatemala",
};
function nombrePais(codigo: string | null): string {
  if (!codigo) return "Desconocido";
  return NOMBRE_PAIS[codigo] ?? codigo;
}

export default async function AnaliticaPage({
  searchParams,
}: {
  searchParams: Promise<{ sitio?: string }>;
}) {
  await requireAdmin();
  const supabase = await createSupabaseServer();
  // eventos_pagina no tiene policy de RLS para authenticated a propósito
  // (ver comentario en la migración 0002) — se lee siempre con el cliente
  // admin. Usar el cliente normal aquí hacía que esta pantalla se viera
  // vacía aunque sí hubiera visitas reales (hallazgo real, 23-sep-2026).
  const admin = createAdminClient();
  const { sitio: sitioParam } = await searchParams;

  const desde = new Date(Date.now() - DIAS_VENTANA * 24 * 60 * 60 * 1000).toISOString();

  const { data: sitiosData } = await admin
    .from("eventos_pagina")
    .select("sitio_slug")
    .gte("created_at", desde)
    .returns<{ sitio_slug: string }[]>();
  const sitiosDisponibles = [...new Set((sitiosData ?? []).map(s => s.sitio_slug))].sort();
  const sitio = sitioParam && sitiosDisponibles.includes(sitioParam) ? sitioParam : sitiosDisponibles[0];

  if (!sitio) {
    return (
      <div>
        <h1 className="font-display mb-2 text-2xl font-semibold text-[var(--text)]">Analítica</h1>
        <p className="text-[var(--text-dim)]">Todavía no hay visitas registradas en los últimos {DIAS_VENTANA} días.</p>
      </div>
    );
  }

  const { data } = await admin
    .from("eventos_pagina")
    .select("sitio_slug, session_id, tipo, etiqueta, pagina, created_at, country, user_agent")
    .eq("sitio_slug", sitio)
    .gte("created_at", desde)
    .order("created_at", { ascending: true })
    .returns<EventoRow[]>();
  const eventos = data ?? [];

  const vistas = eventos.filter(e => e.tipo === "vista");
  const sesionesUnicas = new Set(vistas.map(e => e.session_id));

  const porDia = new Map<string, number>();
  for (const v of vistas) {
    const dia = fmtFecha(v.created_at);
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
  }
  const maxPorDia = Math.max(1, ...porDia.values());

  const sesionesConHito = new Map<number, Set<string>>(HITOS_SCROLL.map(h => [h, new Set<string>()]));
  for (const e of eventos) {
    const match = e.tipo.match(/^scroll_(\d+)$/);
    if (match) sesionesConHito.get(Number(match[1]))?.add(e.session_id);
  }

  const clics = eventos.filter(e => e.tipo === "click_compra");
  const clicsPorBoton = new Map<string, number>();
  for (const c of clics) {
    const etiqueta = c.etiqueta || "(sin etiqueta)";
    clicsPorBoton.set(etiqueta, (clicsPorBoton.get(etiqueta) ?? 0) + 1);
  }

  const totalVistas = vistas.length;
  const tasaClic = totalVistas > 0 ? ((clics.length / totalVistas) * 100).toFixed(1) : "0.0";

  // Un país/navegador por sesión (no por evento) — la primera vista manda.
  const paisPorSesion = new Map<string, string | null>();
  const navegadorPorSesion = new Map<string, string>();
  for (const v of vistas) {
    if (!paisPorSesion.has(v.session_id)) paisPorSesion.set(v.session_id, v.country);
    if (!navegadorPorSesion.has(v.session_id)) navegadorPorSesion.set(v.session_id, detectarNavegador(v.user_agent));
  }
  const porPais = new Map<string, number>();
  for (const pais of paisPorSesion.values()) {
    const etiqueta = nombrePais(pais);
    porPais.set(etiqueta, (porPais.get(etiqueta) ?? 0) + 1);
  }
  const porNavegador = new Map<string, number>();
  for (const nav of navegadorPorSesion.values()) porNavegador.set(nav, (porNavegador.get(nav) ?? 0) + 1);

  // Paso donde más gente se cae del embudo de scroll (mayor caída porcentual entre hitos consecutivos).
  let pasoMayorAbandono: number | null = null;
  let mayorCaida = 0;
  const baseHito = sesionesUnicas.size;
  let anterior = baseHito;
  for (const hito of HITOS_SCROLL) {
    const actual = sesionesConHito.get(hito)?.size ?? 0;
    const caida = anterior > 0 ? ((anterior - actual) / anterior) * 100 : 0;
    if (caida > mayorCaida) {
      mayorCaida = caida;
      pasoMayorAbandono = hito;
    }
    anterior = actual;
  }

  // Ingresos reales de Bold — se busca a la terapeuta por el mismo slug del
  // sitio (eventos_pagina.sitio_slug === terapeutas.slug). Si todavía no
  // tiene fila real, esta sección simplemente no aparece (best-effort).
  const { data: terapeutaRow } = await admin
    .from("terapeutas")
    .select("id")
    .eq("slug", sitio)
    .maybeSingle<{ id: string }>();

  let pagos: { monto: number; moneda: string; producto: string | null; created_at: string }[] = [];
  if (terapeutaRow?.id) {
    const { data: pagosData } = await admin
      .from("pagos_bold")
      .select("monto, moneda, producto, created_at")
      .eq("terapeuta_id", terapeutaRow.id)
      .eq("estado", "aprobado")
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .returns<{ monto: number; moneda: string; producto: string | null; created_at: string }[]>();
    pagos = pagosData ?? [];
  }
  const ingresoPorMoneda = new Map<string, number>();
  for (const p of pagos) ingresoPorMoneda.set(p.moneda, (ingresoPorMoneda.get(p.moneda) ?? 0) + Number(p.monto));
  const tasaConversion = clics.length > 0 ? ((pagos.length / clics.length) * 100).toFixed(1) : "0.0";

  // Contactos capturados ANTES de mandar a pagar (pedido de Fernanda,
  // 22-sep-2026): nombre/teléfono de quien intentó pagar, se apruebe o no el
  // pago — Bold no siempre lo entrega, PayPal tampoco, así que se pide en
  // nuestro propio formulario y queda aquí pase lo que pase con la pasarela.
  let contactos: {
    comprador_nombre: string | null;
    comprador_telefono: string | null;
    comprador_pais: string | null;
    producto: string | null;
    pasarela: string;
    created_at: string;
  }[] = [];
  if (terapeutaRow?.id) {
    const { data: contactosData } = await admin
      .from("solicitudes_pago")
      .select("comprador_nombre, comprador_telefono, comprador_pais, producto, pasarela, created_at")
      .eq("terapeuta_id", terapeutaRow.id)
      .not("comprador_telefono", "is", null)
      .gte("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(100);
    contactos = contactosData ?? [];
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-[var(--text)]">Analítica</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">Últimos {DIAS_VENTANA} días · datos capturados en vivo desde el sitio.</p>
        </div>
        {sitiosDisponibles.length > 1 && (
          <div className="flex gap-2">
            {sitiosDisponibles.map(s => (
              <a
                key={s}
                href={`/panel/analitica?sitio=${s}`}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${
                  s === sitio ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--surface-2)] text-[var(--text-dim)]"
                }`}
              >
                {s}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Visitas</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{totalVistas}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Sesiones únicas</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{sesionesUnicas.size}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Clics de compra</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{clics.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Tasa de clic</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{tasaClic}%</p>
        </div>
      </div>

      {terapeutaRow?.id ? (
        <section className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-5">
          <h2 className="mb-1 text-base font-semibold text-[var(--text)]">Ingresos reales (Bold)</h2>
          <p className="mb-4 text-xs text-[var(--text-dim)]">Pagos aprobados de verdad, no clics — conectado directo al webhook de Bold.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ingresoPorMoneda.size === 0 ? (
              <p className="col-span-full text-sm text-[var(--text-dim)]">Sin pagos aprobados todavía en esta ventana.</p>
            ) : (
              [...ingresoPorMoneda.entries()].map(([moneda, monto]) => (
                <div key={moneda} className="rounded-xl bg-[var(--surface)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Cobrado ({moneda})</p>
                  <p className="mt-1 text-xl font-semibold text-[var(--text)]">
                    {monto.toLocaleString("es-MX", { style: "currency", currency: moneda })}
                  </p>
                </div>
              ))
            )}
            <div className="rounded-xl bg-[var(--surface)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Pagos aprobados</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text)]">{pagos.length}</p>
            </div>
            <div className="rounded-xl bg-[var(--surface)] p-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Conversión (clic → pago)</p>
              <p className="mt-1 text-xl font-semibold text-[var(--text)]">{tasaConversion}%</p>
            </div>
          </div>
          {pagos.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-[var(--border)] pt-4">
              {pagos.slice(0, 8).map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-dim)]">{fmtFecha(p.created_at)} · {p.producto ?? "(sin producto)"}</span>
                  <span className="font-medium text-[var(--text)]">
                    {Number(p.monto).toLocaleString("es-MX", { style: "currency", currency: p.moneda })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-dim)]">
          Los ingresos reales de Bold aparecerán aquí en cuanto esta terapeuta tenga su fila real en el panel
          (con su <code>slug</code>, su llave de Bold y su webhook configurado).
        </div>
      )}

      {terapeutaRow?.id && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-1 text-base font-semibold text-[var(--text)]">Contactos que intentaron pagar</h2>
          <p className="mb-4 text-xs text-[var(--text-dim)]">
            Nombre y teléfono capturados antes de mandar a pagar — se apruebe o no el pago, así se puede contactar a
            quien falló.
          </p>
          {contactos.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">Sin contactos capturados todavía en esta ventana.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {contactos.map((c, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2 text-sm last:border-0"
                >
                  <div>
                    <span className="font-medium text-[var(--text)]">{c.comprador_nombre ?? "(sin nombre)"}</span>
                    <span className="ml-2 text-[var(--text-dim)]">{c.comprador_telefono}</span>
                    {c.comprador_pais && <span className="ml-2 text-xs text-[var(--text-dim)]">· {c.comprador_pais}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-dim)]">
                    <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 font-medium uppercase">{c.pasarela}</span>
                    <span>{c.producto ?? ""}</span>
                    <span>{fmtFecha(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--text)]">Visitas por día</h2>
        {porDia.size === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">Sin visitas todavía.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {[...porDia.entries()].map(([dia, n]) => (
              <div key={dia} className="grid grid-cols-[70px_1fr_36px] items-center gap-2 text-xs">
                <span className="text-[var(--text-dim)]">{dia}</span>
                <div className="h-4 overflow-hidden rounded bg-[var(--surface-2)]">
                  <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${(n / maxPorDia) * 100}%` }} />
                </div>
                <span className="text-right font-medium text-[var(--text)]">{n}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-1 text-base font-semibold text-[var(--text)]">Dónde se están quedando (embudo de scroll)</h2>
        <p className="mb-4 text-xs text-[var(--text-dim)]">% de sesiones que llegaron a cada punto de la página — para optimizar, empieza por donde más gente se cae.</p>
        <div className="flex flex-col gap-2">
          {HITOS_SCROLL.map(hito => {
            const n = sesionesConHito.get(hito)?.size ?? 0;
            const pct = sesionesUnicas.size > 0 ? Math.round((n / sesionesUnicas.size) * 100) : 0;
            const esPeorCaida = hito === pasoMayorAbandono && mayorCaida > 0;
            return (
              <div key={hito} className="grid grid-cols-[60px_1fr_48px] items-center gap-2 text-xs">
                <span className="text-[var(--text-dim)]">{hito}%</span>
                <div className="h-4 overflow-hidden rounded bg-[var(--surface-2)]">
                  <div
                    className={`h-full rounded ${esPeorCaida ? "bg-[var(--danger)]" : "bg-[var(--secondary)]"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-right font-medium text-[var(--text)]">{pct}%</span>
                {esPeorCaida && (
                  <span className="col-span-3 -mt-1 text-[11px] font-semibold text-[var(--danger)]">
                    ⚠ Aquí se cae el {Math.round(mayorCaida)}% de las sesiones — el mayor abandono de la página.
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text)]">Países</h2>
          {porPais.size === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">Sin datos todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...porPais.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([pais, n]) => (
                  <div key={pais} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <span className="text-[var(--text)]">{pais}</span>
                    <span className="font-semibold text-[var(--text)]">{n}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="mb-4 text-base font-semibold text-[var(--text)]">Navegadores</h2>
          {porNavegador.size === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">Sin datos todavía.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {[...porNavegador.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([nav, n]) => (
                  <div key={nav} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
                    <span className="text-[var(--text)]">{nav}</span>
                    <span className="font-semibold text-[var(--text)]">{n}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="mb-4 text-base font-semibold text-[var(--text)]">Clics por botón</h2>
        {clicsPorBoton.size === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">Sin clics de compra todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {[...clicsPorBoton.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([etiqueta, n]) => (
                <div key={etiqueta} className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm">
                  <span className="text-[var(--text)]">{etiqueta}</span>
                  <span className="font-semibold text-[var(--text)]">{n}</span>
                </div>
              ))}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-dashed border-[var(--border)] p-5 text-sm text-[var(--text-dim)]">
        Esto es lo que ya capturamos nosotros mismos (visitas, scroll, clics). Para un mapa de calor real
        (dónde pone el mouse la gente, grabaciones de sesión) hace falta conectar Microsoft Clarity —
        pídele a Fernanda que lo active si lo necesitas.
      </div>
    </div>
  );
}
