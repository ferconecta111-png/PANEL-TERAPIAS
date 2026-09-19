import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service_role — se salta RLS por completo. Solo para server
 * actions/route handlers que ya validaron el rol de quien llama (requireAdmin
 * en lib/auth.ts). Nunca exponer este cliente ni su key al navegador.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
