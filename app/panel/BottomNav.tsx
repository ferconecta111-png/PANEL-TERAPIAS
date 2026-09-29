"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Users, Contact, CalendarDays, Clock, Wallet, LifeBuoy, BarChart3,
  MoreHorizontal, KeyRound, LogOut,
} from "lucide-react";
import { cerrarSesionAction } from "@/app/login/actions";

const PRIMARIOS = 4;

// Duplicado a propósito respecto a layout.tsx: un componente Server no puede
// pasarle un ícono (función/componente) como prop a uno Client — solo datos
// planos cruzan esa frontera. Por eso este arma su propia lista a partir del
// rol (un string sí es serializable), en vez de recibir los links ya armados.
const LINKS_ADMIN = [
  { href: "/panel", label: "Inicio", icon: Home },
  { href: "/panel/terapeutas", label: "Terapeutas", icon: Users },
  { href: "/panel/pacientes", label: "Leads", icon: Contact },
  { href: "/panel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/panel/horario", label: "Horario", icon: Clock },
  { href: "/panel/ventas", label: "Ventas", icon: Wallet },
  { href: "/panel/soporte", label: "Soporte", icon: LifeBuoy },
  { href: "/panel/analitica", label: "Analítica", icon: BarChart3 },
];
const LINKS_TERAPEUTA = [
  { href: "/panel", label: "Inicio", icon: Home },
  { href: "/panel/pacientes", label: "Mis leads", icon: Contact },
  { href: "/panel/agenda", label: "Mi agenda", icon: CalendarDays },
  { href: "/panel/horario", label: "Mi horario", icon: Clock },
  { href: "/panel/analitica", label: "Mi analítica", icon: BarChart3 },
];

/**
 * Barra de navegación de abajo, como cualquier app de celular — la barra
 * lateral de escritorio no cabe bien en pantalla angosta (queda como "sitio
 * web con pestañas", pedido de Fernanda 29-sep-2026 era justo eso: que no se
 * sintiera a navegador). Solo visible en móvil (`md:hidden`); en escritorio
 * sigue el sidebar de siempre.
 */
export default function BottomNav({ role, email }: { role: "admin" | "terapeuta"; email: string }) {
  const pathname = usePathname();
  const [masAbierto, setMasAbierto] = useState(false);
  const links = role === "admin" ? LINKS_ADMIN : LINKS_TERAPEUTA;

  // "Más" siempre existe (aunque no sobren links) porque ahi vive Cuenta/Salir.
  const primarios = links.slice(0, PRIMARIOS);
  const resto = links.slice(PRIMARIOS);

  function activo(href: string): boolean {
    return href === "/panel" ? pathname === "/panel" : pathname.startsWith(href);
  }

  return (
    <>
      <nav
        className="neu fixed inset-x-0 bottom-0 z-40 flex items-center justify-around md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {primarios.map(l => {
          const Icon = l.icon;
          const on = activo(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium"
              style={{ color: on ? "var(--accent)" : "var(--text-dim)" }}
            >
              <Icon size={21} aria-hidden />
              <span className="truncate">{l.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMasAbierto(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10.5px] font-medium text-[var(--text-dim)]"
        >
          <MoreHorizontal size={21} aria-hidden />
          <span>Más</span>
        </button>
      </nav>

      {masAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-end md:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setMasAbierto(false)}
        >
          <div
            className="neu w-full rounded-t-2xl p-5"
            style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--surface-2)]" />
            <nav className="flex flex-col gap-1">
              {resto.map(l => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setMasAbierto(false)}
                    className="pressable flex items-center gap-3 rounded-[var(--r-sm)] px-3 py-3 text-sm font-medium text-[var(--text)]"
                  >
                    <Icon size={19} aria-hidden />
                    {l.label}
                  </Link>
                );
              })}
              <div className="my-2 border-t border-[var(--line)]" />
              <p className="truncate px-3 py-1 text-xs text-[var(--text-dim)]">{email}</p>
              <Link
                href="/panel/cuenta"
                onClick={() => setMasAbierto(false)}
                className="pressable flex items-center gap-3 rounded-[var(--r-sm)] px-3 py-3 text-sm font-medium text-[var(--text)]"
              >
                <KeyRound size={19} aria-hidden />
                Cambiar contraseña
              </Link>
              <form action={cerrarSesionAction}>
                <button
                  type="submit"
                  className="pressable flex w-full items-center gap-3 rounded-[var(--r-sm)] px-3 py-3 text-sm font-medium text-[var(--secondary)]"
                >
                  <LogOut size={19} aria-hidden />
                  Cerrar sesión
                </button>
              </form>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
