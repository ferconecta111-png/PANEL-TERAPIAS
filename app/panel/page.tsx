import { requireSesion } from "@/lib/auth";

export default async function InicioPanel() {
  const sesion = await requireSesion();
  return (
    <div>
      <h1 className="font-display mb-2 text-2xl font-semibold text-[var(--text)]">
        Hola, {sesion.nombre ?? sesion.email}
      </h1>
      <p className="text-[var(--text-dim)]">
        {sesion.role === "admin"
          ? "Desde aquí administras a todas las terapeutas, sus pacientes y sus pagos."
          : "Desde aquí ves tus pacientes, tu agenda y tus notas de seguimiento."}
      </p>
    </div>
  );
}
