import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";
import FormularioTerapeuta from "./FormularioTerapeuta";
import TarjetaTerapeuta from "./TarjetaTerapeuta";

interface FilaTerapeuta {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string | null;
  comision_porcentaje: number;
  activa: boolean;
}

export default async function TerapeutasPage() {
  await requireAdmin();
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("terapeutas")
    .select("id, nombre, email, whatsapp, comision_porcentaje, activa")
    .order("created_at", { ascending: false })
    .returns<FilaTerapeuta[]>();

  const terapeutas = data ?? [];

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-semibold text-[var(--text)]">Terapeutas</h1>

      <div className="mb-8 card p-5">
        <h2 className="mb-3 text-base font-semibold text-[var(--text)]">Dar de alta una nueva terapeuta</h2>
        <FormularioTerapeuta />
      </div>

      <div className="grid gap-3">
        {terapeutas.length === 0 ? (
          <p className="text-sm text-[var(--text-dim)]">Todavía no hay terapeutas registradas.</p>
        ) : (
          terapeutas.map(t => <TarjetaTerapeuta key={t.id} terapeuta={t} />)
        )}
      </div>
    </div>
  );
}
