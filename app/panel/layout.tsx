import Link from "next/link";
import { requireSesion } from "@/lib/auth";
import { cerrarSesionAction } from "@/app/login/actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireSesion();

  const linksAdmin = [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/terapeutas", label: "Terapeutas" },
    { href: "/panel/pacientes", label: "Pacientes" },
    { href: "/panel/agenda", label: "Agenda" },
    { href: "/panel/pagos", label: "Pagos" },
  ];
  const linksTerapeuta = [
    { href: "/panel", label: "Inicio" },
    { href: "/panel/pacientes", label: "Mis pacientes" },
    { href: "/panel/agenda", label: "Mi agenda" },
  ];
  const links = sesion.role === "admin" ? linksAdmin : linksTerapeuta;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] p-5">
        <div>
          <h2 className="font-display mb-6 text-lg font-semibold text-[var(--text)]">Panel de Terapeutas</h2>
          <nav className="flex flex-col gap-1">
            {links.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--accent-soft)] hover:text-[var(--text)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-[var(--border)] pt-4">
          <p className="mb-2 truncate text-xs text-[var(--text-dim)]">{sesion.email}</p>
          <form action={cerrarSesionAction}>
            <button type="submit" className="text-sm font-medium text-[var(--secondary)] hover:underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
