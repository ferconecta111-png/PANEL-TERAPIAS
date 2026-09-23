import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface VentaRow {
  id: string;
  fecha: string;
  terapeuta: string;
  comprador: string | null;
  producto: string | null;
  monto: number;
  moneda: string;
  pasarela: "bold" | "paypal";
  estado: string;
}

const DIAS_VENTANA_DEFECTO = 90;

function fmtMonto(monto: number, moneda: string): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: moneda, maximumFractionDigits: 0 }).format(monto);
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ terapeuta?: string; desde?: string; hasta?: string }>;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const { terapeuta: terapeutaParam, desde: desdeParam, hasta: hastaParam } = await searchParams;

  const { data: terapeutas } = await admin
    .from("terapeutas")
    .select("id, nombre")
    .order("nombre")
    .returns<{ id: string; nombre: string }[]>();
  const mapaTerapeutas = new Map((terapeutas ?? []).map(t => [t.id, t.nombre]));

  const desde = desdeParam || new Date(Date.now() - DIAS_VENTANA_DEFECTO * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const hasta = hastaParam || new Date().toISOString().slice(0, 10);

  let queryBold = admin
    .from("pagos_bold")
    .select("id, terapeuta_id, monto, moneda, producto, estado, payer_email, created_at")
    .gte("created_at", `${desde}T00:00:00`)
    .lte("created_at", `${hasta}T23:59:59`);
  let queryPaypal = admin
    .from("pagos_paypal")
    .select("id, terapeuta_id, monto, moneda, producto, estado, payer_nombre, payer_email, created_at")
    .gte("created_at", `${desde}T00:00:00`)
    .lte("created_at", `${hasta}T23:59:59`);
  if (terapeutaParam) {
    queryBold = queryBold.eq("terapeuta_id", terapeutaParam);
    queryPaypal = queryPaypal.eq("terapeuta_id", terapeutaParam);
  }

  const [{ data: bold }, { data: paypal }] = await Promise.all([
    queryBold.returns<
      { id: string; terapeuta_id: string | null; monto: number; moneda: string; producto: string | null; estado: string; payer_email: string | null; created_at: string }[]
    >(),
    queryPaypal.returns<
      { id: string; terapeuta_id: string | null; monto: number; moneda: string; producto: string | null; estado: string; payer_nombre: string | null; payer_email: string | null; created_at: string }[]
    >(),
  ]);

  const ventas: VentaRow[] = [
    ...(bold ?? []).map(p => ({
      id: p.id,
      fecha: p.created_at,
      terapeuta: (p.terapeuta_id && mapaTerapeutas.get(p.terapeuta_id)) || "Sin asignar",
      comprador: p.payer_email,
      producto: p.producto,
      monto: Number(p.monto),
      moneda: p.moneda,
      pasarela: "bold" as const,
      estado: p.estado,
    })),
    ...(paypal ?? []).map(p => ({
      id: p.id,
      fecha: p.created_at,
      terapeuta: (p.terapeuta_id && mapaTerapeutas.get(p.terapeuta_id)) || "Sin asignar",
      comprador: p.payer_nombre || p.payer_email,
      producto: p.producto,
      monto: Number(p.monto),
      moneda: p.moneda,
      pasarela: "paypal" as const,
      estado: p.estado,
    })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const aprobadas = ventas.filter(v => v.estado === "aprobado");
  const totalesPorMoneda = new Map<string, number>();
  for (const v of aprobadas) totalesPorMoneda.set(v.moneda, (totalesPorMoneda.get(v.moneda) ?? 0) + v.monto);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-title">Ventas</h1>
          <p className="t-support mt-1">Pagos reales de Bold y PayPal, de todas las terapeutas juntos.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        {[...totalesPorMoneda.entries()].map(([moneda, total]) => (
          <div key={moneda} className="neu p-5">
            <p className="t-eyebrow">Ingresos aprobados ({moneda})</p>
            <p className="t-stat mt-1">{fmtMonto(total, moneda)}</p>
          </div>
        ))}
        {totalesPorMoneda.size === 0 && (
          <div className="neu p-5">
            <p className="t-eyebrow">Ingresos aprobados</p>
            <p className="t-stat valor-cero mt-1">$0</p>
          </div>
        )}
      </div>

      <form className="neu-flat flex flex-wrap items-end gap-3 p-4">
        <div>
          <label htmlFor="terapeuta" className="t-micro mb-1 block">Terapeuta</label>
          <select id="terapeuta" name="terapeuta" defaultValue={terapeutaParam ?? ""} className="control">
            <option value="">Todas</option>
            {(terapeutas ?? []).map(t => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="desde" className="t-micro mb-1 block">Desde</label>
          <input id="desde" name="desde" type="date" defaultValue={desde} className="control" />
        </div>
        <div>
          <label htmlFor="hasta" className="t-micro mb-1 block">Hasta</label>
          <input id="hasta" name="hasta" type="date" defaultValue={hasta} className="control" />
        </div>
        <button type="submit" className="btn btn-primario">Filtrar</button>
      </form>

      <div className="neu overflow-x-auto p-2">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[var(--line)] text-sm uppercase tracking-wide text-[var(--text-faint)]">
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Terapeuta</th>
              <th className="px-4 py-3">Comprador</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Pasarela</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map(v => (
              <tr key={`${v.pasarela}-${v.id}`} className="border-b border-[var(--line)] last:border-0">
                <td className="px-4 py-3 text-base text-[var(--text)]">{fmtFecha(v.fecha)}</td>
                <td className="px-4 py-3 text-base text-[var(--text)]">{v.terapeuta}</td>
                <td className="px-4 py-3 text-base text-[var(--text-dim)]">{v.comprador ?? "—"}</td>
                <td className="px-4 py-3 text-base text-[var(--text-dim)]">{v.producto ?? "—"}</td>
                <td className="px-4 py-3 text-base font-semibold text-[var(--text)]">{fmtMonto(v.monto, v.moneda)}</td>
                <td className="px-4 py-3 text-base capitalize text-[var(--text-dim)]">{v.pasarela}</td>
                <td className="px-4 py-3 text-base text-[var(--text-dim)]">{v.estado}</td>
              </tr>
            ))}
            {ventas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-base text-[var(--text-dim)]">
                  No hay ventas en este rango.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
