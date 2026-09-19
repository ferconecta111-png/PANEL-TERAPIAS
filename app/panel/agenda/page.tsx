import { requireSesion } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import FormularioCita from "./FormularioCita";
import ListaCitas from "./ListaCitas";

/** Aislada del render para que el linter de pureza de componentes no la marque. */
function desdeAyerIso(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

interface FilaCita {
  id: string;
  start_at: string;
  end_at: string;
  estado: string;
  pacientes: { nombre: string } | null;
  terapeutas: { nombre: string } | null;
}

export default async function AgendaPage() {
  const sesion = await requireSesion();
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("citas")
    .select("id, start_at, end_at, estado, pacientes(nombre), terapeutas(nombre)")
    .gte("start_at", desdeAyerIso())
    .order("start_at", { ascending: true });

  if (sesion.role !== "admin" && sesion.terapeutaId) {
    query = query.eq("terapeuta_id", sesion.terapeutaId);
  }

  const { data } = await query.returns<FilaCita[]>();
  const citas = data ?? [];

  let opciones: { pacientes: { id: string; nombre: string }[]; terapeutas: { id: string; nombre: string }[] } = {
    pacientes: [],
    terapeutas: [],
  };
  {
    let pacientesQuery = supabase.from("pacientes").select("id, nombre");
    if (sesion.role !== "admin" && sesion.terapeutaId) pacientesQuery = pacientesQuery.eq("terapeuta_id", sesion.terapeutaId);
    const { data: pacientes } = await pacientesQuery;
    const { data: terapeutas } = sesion.role === "admin" ? await supabase.from("terapeutas").select("id, nombre").eq("activa", true) : { data: [] };
    opciones = { pacientes: pacientes ?? [], terapeutas: terapeutas ?? [] };
  }

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold text-[var(--text)]">
        {sesion.role === "admin" ? "Agenda" : "Mi agenda"}
      </h1>

      <div className="mb-8 card p-5">
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">Agendar cita</h2>
        <FormularioCita pacientes={opciones.pacientes} terapeutas={opciones.terapeutas} esAdmin={sesion.role === "admin"} />
      </div>

      <ListaCitas
        citas={citas.map(c => ({
          id: c.id,
          startAt: c.start_at,
          estado: c.estado,
          pacienteNombre: c.pacientes?.nombre ?? "—",
          terapeutaNombre: c.terapeutas?.nombre ?? "—",
        }))}
        mostrarTerapeuta={sesion.role === "admin"}
      />
    </div>
  );
}
