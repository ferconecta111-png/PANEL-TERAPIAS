"use client";

import { useActionState, useMemo, useState } from "react";
import { solicitarCitaAction } from "./actions";
import { ESTADO_SOLICITUD_INICIAL } from "./types";
import CalendarioMes from "./CalendarioMes";
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
        <CalendarioMes
          fechasDisponibles={huecos.map(h => h.fecha)}
          fechaElegida={fechaElegida}
          onElegir={fecha => { setFechaElegida(fecha); setHoraElegida(null); }}
          marca={marca}
        />
      </div>

      {fechaElegida && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, margin: "12px 0 10px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: marca.text, margin: 0 }}>
              {fmtFechaLarga(fechaElegida)}
            </p>
            <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: marca.textFaint }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: marca.accentTint, border: `1.5px solid ${marca.accent}`, display: "inline-block" }} />
                Disponible
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#e4e4e4", display: "inline-block" }} />
                Ocupado
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {slotsDelDia.map(s => (
              <button
                key={s.hora}
                type="button"
                disabled={!s.libre}
                onClick={() => s.libre && setHoraElegida(s.hora)}
                title={s.libre ? undefined : "Ese horario ya está ocupado"}
                className="agendar-slot"
                style={{
                  padding: "9px 16px", borderRadius: 999, fontSize: 13.5, fontWeight: 600,
                  cursor: s.libre ? "pointer" : "not-allowed",
                  border: `1.5px solid ${horaElegida === s.hora ? marca.accent : s.libre ? marca.border : "#e4e4e4"}`,
                  background: horaElegida === s.hora ? marca.accent : s.libre ? "transparent" : "#f2f2f2",
                  color: horaElegida === s.hora ? "#fff" : s.libre ? marca.text : "#a8a8a8",
                  textDecoration: s.libre ? "none" : "line-through",
                }}
              >
                {s.hora}
              </button>
            ))}
          </div>
          <style>{`
            .agendar-slot:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 4px 10px -4px rgba(0,0,0,0.25); }
            .agendar-slot { transition: transform 0.12s, box-shadow 0.12s; }
          `}</style>
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
