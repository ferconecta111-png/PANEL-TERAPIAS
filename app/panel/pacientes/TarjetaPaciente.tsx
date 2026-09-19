import Link from "next/link";

const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  en_proceso: "En proceso",
  activo: "Activo",
  cerrado: "Cerrado",
  perdido: "Perdido",
};

export default function TarjetaPaciente({
  paciente,
  mostrarTerapeuta,
}: {
  paciente: {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    producto: string | null;
    estado: string;
    terapeutaNombre: string | null;
  };
  mostrarTerapeuta: boolean;
}) {
  return (
    <Link href={`/panel/pacientes/${paciente.id}`} className="card flex items-center justify-between p-4 hover:border-[var(--accent)]">
      <div>
        <p className="font-semibold text-[var(--text)]">{paciente.nombre}</p>
        <p className="text-sm text-[var(--text-dim)]">
          {paciente.telefono ?? paciente.email ?? "sin contacto"}
          {paciente.producto && ` · ${paciente.producto}`}
          {mostrarTerapeuta && paciente.terapeutaNombre && ` · ${paciente.terapeutaNombre}`}
        </p>
      </div>
      <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium text-[var(--text)]">
        {ESTADO_LABEL[paciente.estado] ?? paciente.estado}
      </span>
    </Link>
  );
}
