import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { huecosDisponibles } from "@/lib/agendamiento/disponibilidad";
import { marcaDe } from "@/lib/agendamiento/marca";
import FormularioAgendar from "./FormularioAgendar";

interface TerapeutaFila {
  id: string;
  nombre: string;
  foto_url: string | null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Agenda tu cita — ${marcaDe(slug).nombreCorto}` };
}

export default async function AgendarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: terapeuta } = await admin
    .from("terapeutas")
    .select("id, nombre, foto_url")
    .eq("slug", slug)
    .eq("activa", true)
    .maybeSingle<TerapeutaFila>();

  if (!terapeuta) notFound();

  const huecos = await huecosDisponibles(terapeuta.id);
  const marca = marcaDe(slug);

  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", background: marca.bg, color: marca.text, fontFamily: marca.fontBody, zIndex: 1 }}>
      <link rel="stylesheet" href={marca.googleFonts} />
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 64px" }}>
        <p style={{
          fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          color: marca.accentDeep, textAlign: "center", margin: "0 0 8px",
        }}>
          Agenda tu cita
        </p>
        <h1 style={{
          fontFamily: marca.fontDisplay, fontSize: 26, textAlign: "center", margin: "0 0 8px", color: marca.text,
        }}>
          {terapeuta.nombre}
        </h1>
        <p style={{ textAlign: "center", color: marca.textFaint, fontSize: 15, margin: "0 0 32px" }}>
          Elige el día y la hora que mejor te quede — {marca.nombreCorto} confirma tu cita apenas la vea.
        </p>

        {huecos.length === 0 ? (
          <div style={{ background: marca.surface, border: `1px solid ${marca.border}`, borderRadius: 20, padding: "32px 26px", textAlign: "center" }}>
            <p style={{ color: marca.textFaint, fontSize: 15, margin: 0 }}>
              No hay horarios disponibles por ahora. Escríbele directo por WhatsApp para coordinar.
            </p>
          </div>
        ) : (
          <FormularioAgendar slug={slug} huecos={huecos} marca={marca} />
        )}
      </div>
    </div>
  );
}
