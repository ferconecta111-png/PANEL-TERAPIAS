"use client";

import { useActionState, useMemo, useState } from "react";
import { solicitarCitaAction } from "./actions";
import { ESTADO_SOLICITUD_INICIAL } from "./types";
import type { HuecosPorDia } from "@/lib/agendamiento/disponibilidad";
import type { MarcaTerapeuta } from "@/lib/agendamiento/marca";

function fmtFechaLarga(fechaIso: string): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const fecha = new Date(Date.UTC(y!, m! - 1, d!, 12));
  const texto = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(fecha);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function FormularioAgendar({
  slug,
  huecos,
  marca,
}: {
  slug: string;
  huecos: HuecosPorDia[];
  marca: MarcaTerapeuta;
}) {
  const [estado, accion, pendiente] = useActionState(solicitarCitaAction, ESTADO_SOLICITUD_INICIAL);
  const [fechaElegida, setFechaElegida] = useState<string | null>(huecos[0]?.fecha ?? null);
  const [horaElegida, setHoraElegida] = useState<string | null>(null);

  const slotsDelDia = useMemo(
    () => huecos.find(h => h.fecha === fechaElegida)?.slots ?? [],
    [huecos, fechaElegida],
  );

  if (estado.ok) {
    return (
      <div style={{ background: marca.surface, border: `1px solid ${marca.border}`, borderRadius: 20, padding: "32px 26px", textAlign: "center" }}>
        <p style={{ fontFamily: marca.fontDisplay, fontSize: 22, color: marca.accentDeep, margin: "0 0 10px" }}>¡Solicitud enviada!</p>
        <p style={{ color: marca.textFaint, fontSize: 15, margin: 0 }}>
          {marca.nombreCorto} va a confirmar tu cita pronto. Te vamos a escribir por WhatsApp para avisarte.
        </p>
      </div>
    );
  }

  return (
    <form action={accion} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="fecha" value={fechaElegida ?? ""} />
      <input type="hidden" name="hora" value={horaElegida ?? ""} />

      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: marca.text, margin: "0 0 8px" }}>Elige un día</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {huecos.map(h => (
            <button
              key={h.fecha}
              type="button"
              onClick={() => { setFechaElegida(h.fecha); setHoraElegida(null); }}
              style={{
                padding: "9px 14px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                border: `1.5px solid ${fechaElegida === h.fecha ? marca.accent : marca.border}`,
                background: fechaElegida === h.fecha ? marca.accent : "transparent",
                color: fechaElegida === h.fecha ? "#fff" : marca.text,
              }}
            >
              {fmtFechaLarga(h.fecha)}
            </button>
          ))}
        </div>
      </div>

      {fechaElegida && (
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: marca.text, margin: "0 0 8px" }}>Elige una hora</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {slotsDelDia.map(hora => (
              <button
                key={hora}
                type="button"
                onClick={() => setHoraElegida(hora)}
                style={{
                  padding: "9px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  border: `1.5px solid ${horaElegida === hora ? marca.accent : marca.border}`,
                  background: horaElegida === hora ? marca.accent : "transparent",
                  color: horaElegida === hora ? "#fff" : marca.text,
                }}
              >
                {hora}
              </button>
            ))}
          </div>
        </div>
      )}

      {horaElegida && (
        <>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: marca.text, marginBottom: 4 }}>Nombre completo</label>
            <input name="nombre" required style={inputStyle(marca)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: marca.text, marginBottom: 4 }}>WhatsApp (con código de país)</label>
            <input name="telefono" type="tel" placeholder="+57 300 1234567" required style={inputStyle(marca)} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: marca.text, marginBottom: 4 }}>Correo (opcional)</label>
            <input name="email" type="email" style={inputStyle(marca)} />
          </div>

          {estado.error && <p style={{ color: "#b23b3b", fontSize: 13.5, margin: 0 }}>{estado.error}</p>}

          <button
            type="submit"
            disabled={pendiente}
            style={{
              padding: "14px 20px", borderRadius: 999, border: "none", cursor: "pointer",
              background: `linear-gradient(155deg, ${marca.accent}, ${marca.accentDeep})`,
              color: "#fff", fontWeight: 800, fontSize: 15, opacity: pendiente ? 0.7 : 1,
            }}
          >
            {pendiente ? "Enviando..." : "Solicitar esta cita"}
          </button>
        </>
      )}
    </form>
  );
}

function inputStyle(marca: MarcaTerapeuta): React.CSSProperties {
  return {
    width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: 16,
    border: `1px solid ${marca.border}`, borderRadius: 10, background: marca.surface, color: marca.text,
  };
}
