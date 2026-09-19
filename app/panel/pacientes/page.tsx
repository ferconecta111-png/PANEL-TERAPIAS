import { requireSesion } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import FormularioPaciente from "./FormularioPaciente";
import TarjetaPaciente from "./TarjetaPaciente";

interface FilaPaciente {
  id: string;
  nombre: string;
  telefono: string | null;
  email: string | null;
  producto: string | null;
  estado: string;
  terapeuta_id: string | null;
  terapeutas: { nombre: string } | null;
}

export default async function PacientesPage() {
  const sesion = await requireSesion();
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("pacientes")
    .select("id, nombre, telefono, email, producto, estado, terapeuta_id, terapeutas(nombre)")
    .order("created_at", { ascending: false });

  if (sesion.role !== "admin" && sesion.terapeutaId) {
    query = query.eq("terapeuta_id", sesion.terapeutaId);
  }

  const { data } = await query.returns<FilaPaciente[]>();
  const pacientes = data ?? [];

  let terapeutas: { id: string; nombre: string }[] = [];
  if (sesion.role === "admin") {
    const { data: listaTerapeutas } = await supabase.from("terapeutas").select("id, nombre").eq("activa", true);
    terapeutas = listaTerapeutas ?? [];
  }

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold text-[var(--text)]">
        {sesion.role === "admin" ? "Pacientes" : "Mis pacientes"}
      </h1>

      <div className="mb-8 card p-5">
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">Agregar paciente</h2>
        <FormularioPaciente terapeutas={terapeutas} esAdmin={sesion.role === "admin"} />
      </div>

      <div className="grid gap-3">
        {pacientes.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">Todavía no hay pacientes registrados.</p>
        ) : (
          pacientes.map(p => (
            <TarjetaPaciente
              key={p.id}
              paciente={{
                id: p.id,
                nombre: p.nombre,
                telefono: p.telefono,
                email: p.email,
                producto: p.producto,
                estado: p.estado,
                terapeutaNombre: p.terapeutas?.nombre ?? null,
              }}
              mostrarTerapeuta={sesion.role === "admin"}
            />
          ))
        )}
      </div>
    </div>
  );
}
