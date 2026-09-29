import type { Metadata } from "next";
import { requireSesion } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import FormularioHorario, { type HorarioFila } from "./FormularioHorario";

export const metadata: Metadata = { title: "Mi horario" };

const SITIO_PUBLICO = "https://panel-terapeutas.vercel.app";

export default async function HorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ terapeutaId?: string }>;
}) {
  const sesion = await requireSesion();
  const supabase = await createSupabaseServer();
  const { terapeutaId: terapeutaIdParam } = await searchParams;

  let terapeutas: { id: string; nombre: string; slug: string | null }[] = [];
  let terapeutaId = sesion.terapeutaId;

  if (sesion.role === "admin") {
    const { data } = await supabase.from("terapeutas").select("id, nombre, slug").eq("activa", true).order("nombre");
    terapeutas = data ?? [];
    terapeutaId = terapeutaIdParam && terapeutas.some(t => t.id === terapeutaIdParam) ? terapeutaIdParam : (terapeutas[0]?.id ?? null);
  }

  if (!terapeutaId) {
    return (
      <div>
        <h1 className="font-display mb-6 text-2xl font-semibold text-[var(--text)]">Mi horario</h1>
        <p className="text-[var(--text-dim)]">Tu cuenta todavía no está vinculada a un perfil de terapeuta.</p>
      </div>
    );
  }

  const { data: horariosData } = await supabase
    .from("horarios_terapeuta")
    .select("id, dia_semana, hora_inicio, hora_fin")
    .eq("terapeuta_id", terapeutaId)
    .order("dia_semana");
  const horarios: HorarioFila[] = (horariosData ?? []).map(h => ({
    id: h.id, diaSemana: h.dia_semana, horaInicio: h.hora_inicio, horaFin: h.hora_fin,
  }));

  const { data: terapeutaActual } = await supabase.from("terapeutas").select("slug").eq("id", terapeutaId).maybeSingle<{ slug: string | null }>();
  const linkPublico = terapeutaActual?.slug ? `${SITIO_PUBLICO}/agendar/${terapeutaActual.slug}` : null;

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-semibold text-[var(--text)]">Mi horario</h1>
      <p className="mb-4 text-[var(--text-dim)]">
        Estas son las horas en que apareces disponible para que un paciente pida cita desde tu link público.
      </p>

      {sesion.role === "admin" && terapeutas.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {terapeutas.map(t => (
            <a
              key={t.id}
              href={`/panel/horario?terapeutaId=${t.id}`}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${t.id === terapeutaId ? "bg-[var(--accent)] text-[var(--accent-ink)]" : "bg-[var(--surface-2)] text-[var(--text-dim)]"}`}
            >
              {t.nombre}
            </a>
          ))}
        </div>
      )}

      {linkPublico && (
        <div className="mb-6 card p-4">
          <p className="mb-1 text-sm font-semibold text-[var(--text)]">Link para mandarle a tus pacientes</p>
          <a href={linkPublico} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--accent)] underline break-all">
            {linkPublico}
          </a>
        </div>
      )}

      <FormularioHorario horarios={horarios} terapeutaId={sesion.role === "admin" ? terapeutaId : undefined} />
    </div>
  );
}
