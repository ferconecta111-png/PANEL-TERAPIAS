import Link from "next/link";
import {
  Home,
  Users,
  Contact,
  CalendarDays,
  Wallet,
  LifeBuoy,
  BarChart3,
  LogOut,
} from "lucide-react";
import { requireSesion } from "@/lib/auth";
import { cerrarSesionAction } from "@/app/login/actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesion = await requireSesion();

  const linksAdmin = [
    { href: "/panel", label: "Inicio", icon: Home },
    { href: "/panel/terapeutas", label: "Terapeutas", icon: Users },
    { href: "/panel/pacientes", label: "Leads", icon: Contact },
    { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
    { href: "/panel/ventas", label: "Ventas", icon: Wallet },
    { href: "/panel/soporte", label: "Soporte", icon: LifeBuoy },
    { href: "/panel/analitica", label: "Analítica", icon: BarChart3 },
  ];
  const linksTerapeuta = [
    { href: "/panel", label: "Inicio", icon: Home },
    { href: "/panel/pacientes", label: "Mis leads", icon: Contact },
    { href: "/panel/agenda", label: "Mi agenda", icon: CalendarDays },
  ];
  const links = sesion.role === "admin" ? linksAdmin : linksTerapeuta;

  return (
    <div className="flex min-h-screen">
      <aside className="neu flex w-64 shrink-0 flex-col justify-between p-5">
        <div>
          <h2 className="t-subtitle mb-6">Panel de Terapeutas</h2>
          <nav className="flex flex-col gap-1">
            {links.map(l => {
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="pressable flex items-center gap-3 rounded-[var(--r-sm)] px-3 py-2 text-sm font-medium text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
                >
                  <Icon size={18} aria-hidden />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="border-t border-[var(--line)] pt-4">
          <p className="mb-2 truncate text-xs text-[var(--text-dim)]">{sesion.email}</p>
          <form action={cerrarSesionAction}>
            <button
              type="submit"
              className="pressable flex items-center gap-2 text-sm font-medium text-[var(--secondary)] hover:underline"
            >
              <LogOut size={16} aria-hidden />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-8">{children}</main>
    </div>
  );
}
