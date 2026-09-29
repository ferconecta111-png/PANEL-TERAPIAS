"use client";

import type { MarcaTerapeuta } from "@/lib/agendamiento/marca";

const DIAS_HEADER = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function aFechaUtc(fechaIso: string): Date {
  const [y, m, d] = fechaIso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12));
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Lunes=0 ... Domingo=6 (para acomodar la grilla estilo calendario). */
function columnaDeLunes(fecha: Date): number {
  return (fecha.getUTCDay() + 6) % 7;
}

export default function CalendarioMes({
  fechasDisponibles,
  fechaElegida,
  onElegir,
  marca,
}: {
  /** Días con horario cargado ese día de la semana — pueden estar totalmente
   *  ocupados igual; eso se ve al entrar al día, no aquí. */
  fechasDisponibles: string[];
  fechaElegida: string | null;
  onElegir: (fecha: string) => void;
  marca: MarcaTerapeuta;
}) {
  const primera = aFechaUtc(fechasDisponibles[0]!);
  const ultima = aFechaUtc(fechasDisponibles[fechasDisponibles.length - 1]!);

  const inicioGrilla = new Date(primera);
  inicioGrilla.setUTCDate(inicioGrilla.getUTCDate() - columnaDeLunes(primera));

  const finGrilla = new Date(ultima);
  finGrilla.setUTCDate(finGrilla.getUTCDate() + (6 - columnaDeLunes(ultima)));

  const dias: Date[] = [];
  for (let d = new Date(inicioGrilla); d <= finGrilla; d.setUTCDate(d.getUTCDate() + 1)) {
    dias.push(new Date(d));
  }

  const disponibles = new Set(fechasDisponibles);

  const mesInicio = MESES[primera.getUTCMonth()];
  const mesFin = MESES[ultima.getUTCMonth()];
  const tituloMes = mesInicio === mesFin
    ? `${mesInicio} ${primera.getUTCFullYear()}`
    : `${mesInicio} – ${mesFin} ${ultima.getUTCFullYear()}`;

  return (
    <div>
      <p style={{
        textAlign: "center", fontFamily: marca.fontDisplay, fontSize: 16, textTransform: "capitalize",
        color: marca.text, margin: "0 0 12px",
      }}>
        {tituloMes}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {DIAS_HEADER.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: marca.textFaint, textTransform: "uppercase" }}>
            {d}
          </div>
        ))}
        {dias.map(dia => {
          const iso = aIso(dia);
          const disponible = disponibles.has(iso);
          const elegido = iso === fechaElegida;
          return (
            <button
              key={iso}
              type="button"
              disabled={!disponible}
              onClick={() => onElegir(iso)}
              className={disponible ? "agendar-dia" : undefined}
              style={{
                aspectRatio: "1 / 1",
                borderRadius: 12,
                border: `1.5px solid ${elegido ? marca.accent : "transparent"}`,
                background: elegido ? marca.accent : disponible ? marca.accentTint : "transparent",
                color: elegido ? "#fff" : disponible ? marca.accentDeep : marca.border,
                fontWeight: disponible ? 700 : 500,
                fontSize: 14,
                cursor: disponible ? "pointer" : "default",
                transition: "transform 0.12s, box-shadow 0.12s",
              }}
            >
              {dia.getUTCDate()}
            </button>
          );
        })}
      </div>
      <style>{`
        .agendar-dia:hover { transform: translateY(-1px) scale(1.05); box-shadow: 0 4px 10px -4px rgba(0,0,0,0.25); }
      `}</style>
    </div>
  );
}
