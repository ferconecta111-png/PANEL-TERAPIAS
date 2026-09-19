import { notFound } from "next/navigation";
import { requireSesion } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import FormularioNota from "./FormularioNota";
import FormularioSolicitudPago from "./FormularioSolicitudPago";

interface Nota {
  id: string;
  nota: string;
  created_at: string;
}

export default async function DetallePacientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await requireSesion();
  const supabase = await createSupabaseServer();

  const { data: paciente } = await supabase
    .from("pacientes")
    .select("id, nombre, telefono, email, producto, estado, terapeuta_id")
    .eq("id", id)
    .maybeSingle<{ id: string; nombre: string; telefono: string | null; email: string | null; producto: string | null; estado: string; terapeuta_id: string | null }>();

  if (!paciente) notFound();

  const { data: notas } = await supabase
    .from("notas_paciente")
    .select("id, nota, created_at")
    .eq("paciente_id", id)
    .order("created_at", { ascending: false })
    .returns<Nota[]>();

  const terapeutaId = sesion.role === "admin" ? paciente.terapeuta_id : sesion.terapeutaId;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display mb-1 text-2xl font-semibold text-[var(--text)]">{paciente.nombre}</h1>
      <p className="mb-6 text-sm text-[var(--text-dim)]">
        {paciente.telefono ?? "sin teléfono"} · {paciente.email ?? "sin correo"} · {paciente.producto ?? "sin producto"}
      </p>

      {terapeutaId && (
        <div className="mb-6 card p-5">
          <h2 className="mb-3 text-base font-semibold text-[var(--text)]">Solicitar pago (Bold)</h2>
          <FormularioSolicitudPago pacienteId={paciente.id} terapeutaId={terapeutaId} esAdmin={sesion.role === "admin"} />
        </div>
      )}

      <div className="card p-5">
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">Notas de seguimiento</h2>
        {terapeutaId && <FormularioNota pacienteId={paciente.id} terapeutaId={terapeutaId} />}

        <ul className="mt-4 flex flex-col gap-3">
          {(notas ?? []).length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">Todavía no hay notas para este paciente.</p>
          ) : (
            notas!.map(n => (
              <li key={n.id} className="border-l-2 border-[var(--accent)] pl-3">
                <p className="text-sm text-[var(--text)]">{n.nota}</p>
                <p className="text-xs text-[var(--text-dim)]">
                  {new Date(n.created_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
