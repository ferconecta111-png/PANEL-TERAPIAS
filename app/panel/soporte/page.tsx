import { requireSesion } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import NuevoCasoForm from "./NuevoCasoForm";
import EstadoCasoSelect from "./EstadoCasoSelect";

interface CasoRow {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: "abierto" | "en_proceso" | "cerrado";
  created_at: string;
  terapeuta_id: string;
  paciente_id: string | null;
}

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function SoportePage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const sesion = await requireSesion();
  const admin = createAdminClient();
  const { estado: filtroEstado } = await searchParams;

  const [{ data: terapeutas }, { data: pacientes }] = await Promise.all([
    admin.from("terapeutas").select("id, nombre").order("nombre").returns<{ id: string; nombre: string }[]>(),
    admin.from("pacientes").select("id, nombre, terapeuta_id").order("nombre").returns<{ id: string; nombre: string; terapeuta_id: string | null }[]>(),
  ]);
  const mapaTerapeutas = new Map((terapeutas ?? []).map(t => [t.id, t.nombre]));
  const mapaPacientes = new Map((pacientes ?? []).map(p => [p.id, p.nombre]));

  let query = admin
    .from("casos_soporte")
    .select("id, titulo, descripcion, estado, created_at, terapeuta_id, paciente_id")
    .order("created_at", { ascending: false });
  if (sesion.role !== "admin" && sesion.terapeutaId) query = query.eq("terapeuta_id", sesion.terapeutaId);
  if (filtroEstado === "abierto" || filtroEstado === "en_proceso" || filtroEstado === "cerrado") {
    query = query.eq("estado", filtroEstado);
  }
  const { data } = await query.returns<CasoRow[]>();
  const casos = data ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-title">Soporte</h1>
          <p className="t-support mt-1">Bitácora de casos — consultas o problemas que no están ligados a un pago.</p>
        </div>
      </div>

      <NuevoCasoForm
        terapeutas={(terapeutas ?? []).map(t => ({ id: t.id, nombre: t.nombre }))}
        pacientes={(pacientes ?? [])
          .filter((p): p is { id: string; nombre: string; terapeuta_id: string } => p.terapeuta_id !== null)
          .map(p => ({ id: p.id, nombre: p.nombre, terapeutaId: p.terapeuta_id }))}
        mostrarSelectorTerapeuta={sesion.role === "admin"}
      />

      <div className="flex gap-2">
        {[
          { valor: "", etiqueta: "Todos" },
          { valor: "abierto", etiqueta: "Abiertos" },
          { valor: "en_proceso", etiqueta: "En proceso" },
          { valor: "cerrado", etiqueta: "Cerrados" },
        ].map(f => (
          <a
            key={f.valor}
            href={f.valor ? `/panel/soporte?estado=${f.valor}` : "/panel/soporte"}
            className={`btn ${(filtroEstado ?? "") === f.valor ? "btn-secundario" : "btn-fantasma"}`}
          >
            {f.etiqueta}
          </a>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {casos.map(c => (
          <div key={c.id} className="neu flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="min-w-0 flex-1">
              <p className="t-subtitle">{c.titulo}</p>
              <p className="t-micro mt-1">
                {mapaTerapeutas.get(c.terapeuta_id) ?? "—"}
                {c.paciente_id && ` · ${mapaPacientes.get(c.paciente_id) ?? "paciente"}`}
                {" · "}
                {fmtFecha(c.created_at)}
              </p>
              {c.descripcion && <p className="t-body mt-2">{c.descripcion}</p>}
            </div>
            <EstadoCasoSelect casoId={c.id} estado={c.estado} />
          </div>
        ))}
        {casos.length === 0 && (
          <p className="t-support">No hay casos con este filtro.</p>
        )}
      </div>
    </div>
  );
}
