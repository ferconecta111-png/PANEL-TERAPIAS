import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface Sesion {
  userId: string;
  email: string;
  role: "admin" | "terapeuta";
  nombre: string | null;
  terapeutaId: string | null;
}

/** Sin sesion real -> redirect a /login. Primer usuario que confirma cuenta (tabla profiles vacia) se vuelve admin. */
export async function requireSesion(): Promise<Sesion> {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: perfil } = await supabase
    .from("profiles")
    .select("role, nombre")
    .eq("user_id", user.id)
    .maybeSingle<{ role: "admin" | "terapeuta"; nombre: string | null }>();

  if (!perfil) {
    const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const role = !count || count === 0 ? "admin" : "terapeuta";
    await supabase.from("profiles").insert({ user_id: user.id, role, nombre: user.email });
    perfil = { role, nombre: user.email ?? null };
  }

  const { data: terapeuta } = await supabase
    .from("terapeutas")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: string }>();

  return {
    userId: user.id,
    email: user.email ?? "",
    role: perfil.role,
    nombre: perfil.nombre,
    terapeutaId: terapeuta?.id ?? null,
  };
}

export async function requireAdmin(): Promise<Sesion> {
  const sesion = await requireSesion();
  if (sesion.role !== "admin") redirect("/panel");
  return sesion;
}
