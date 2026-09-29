import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Las terapeutas operan en Colombia — sin esto, "9am" escrito en el
 * formulario se guardaba como 9am UTC (5 horas adelantado de verdad).
 */
export const TZ = "America/Bogota";
export const DURACION_MIN = 70;
const DIAS_HACIA_ADELANTE = 14;

const DIA_EN_A_NUM: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** "2026-09-30" en la zona de la terapeuta, a partir de un Date real. */
export function fechaLocal(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Día de la semana (0=domingo) que le corresponde a una fecha "YYYY-MM-DD" en la zona de la terapeuta. */
function diaSemanaDeFecha(fechaIso: string): number {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date(`${fechaIso}T12:00:00Z`)); // mediodia UTC: nunca cruza de dia por el huso
  const weekday = partes.find(p => p.type === "weekday")?.value ?? "Sun";
  return DIA_EN_A_NUM[weekday] ?? 0;
}

/** Convierte "2026-09-30" + "14:00" (hora de la terapeuta) al instante UTC real. */
export function localAUtc(fechaIso: string, hhmm: string): Date {
  // Truco: pedirle a Intl el offset de ESE dia (Bogota no tiene horario de
  // verano, pero este mismo codigo sirve si algun dia se usa otra ciudad).
  const [horaStr, minStr] = hhmm.split(":");
  const candidato = new Date(`${fechaIso}T${horaStr}:${minStr}:00Z`);
  const enTz = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(candidato);
  const [hEnTz, mEnTz] = enTz.split(":").map(Number);
  const minutosDeseados = Number(horaStr) * 60 + Number(minStr);
  const minutosObtenidos = (hEnTz === 24 ? 0 : hEnTz) * 60 + mEnTz;
  const diffMin = minutosDeseados - minutosObtenidos;
  return new Date(candidato.getTime() + diffMin * 60_000);
}

interface HorarioFila {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

interface RangoOcupado {
  start_at: string;
  end_at: string;
}

/** "HH:mm" cada DURACION_MIN minutos, dentro de [inicio, fin). */
function slotsDelDia(horaInicio: string, horaFin: string): string[] {
  const [hi, mi] = horaInicio.slice(0, 5).split(":").map(Number);
  const [hf, mf] = horaFin.slice(0, 5).split(":").map(Number);
  const inicioMin = hi * 60 + mi;
  const finMin = hf * 60 + mf;
  const slots: string[] = [];
  for (let m = inicioMin; m + DURACION_MIN <= finMin; m += DURACION_MIN) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}

export interface HuecosPorDia {
  fecha: string;
  slots: string[];
}

/**
 * Huecos reales de los proximos 14 dias: el horario semanal de la terapeuta
 * menos lo que ya esta ocupado (citas confirmadas + solicitudes pendientes
 * de OTRO paciente) y menos las horas que ya pasaron hoy.
 */
export async function huecosDisponibles(terapeutaId: string): Promise<HuecosPorDia[]> {
  const admin = createAdminClient();

  const [{ data: horarios }, { data: citasOcupadas }, { data: solicitudesPendientes }] = await Promise.all([
    admin.from("horarios_terapeuta").select("dia_semana, hora_inicio, hora_fin").eq("terapeuta_id", terapeutaId).returns<HorarioFila[]>(),
    admin.from("citas").select("start_at, end_at").eq("terapeuta_id", terapeutaId).eq("estado", "agendada").returns<RangoOcupado[]>(),
    admin.from("solicitudes_cita").select("start_at, end_at").eq("terapeuta_id", terapeutaId).eq("estado", "pendiente").returns<RangoOcupado[]>(),
  ]);

  if (!horarios || horarios.length === 0) return [];
  const ocupados = [...(citasOcupadas ?? []), ...(solicitudesPendientes ?? [])].map(r => ({
    inicio: new Date(r.start_at).getTime(),
    fin: new Date(r.end_at).getTime(),
  }));

  const horariosPorDia = new Map<number, HorarioFila[]>();
  for (const h of horarios) {
    if (!horariosPorDia.has(h.dia_semana)) horariosPorDia.set(h.dia_semana, []);
    horariosPorDia.get(h.dia_semana)!.push(h);
  }

  const ahora = Date.now();
  const resultado: HuecosPorDia[] = [];
  for (let i = 0; i < DIAS_HACIA_ADELANTE; i++) {
    const fecha = fechaLocal(new Date(ahora + i * 86_400_000));
    const dia = diaSemanaDeFecha(fecha);
    const horariosDelDia = horariosPorDia.get(dia) ?? [];
    if (horariosDelDia.length === 0) continue;

    const slotsLibres: string[] = [];
    for (const h of horariosDelDia) {
      for (const hhmm of slotsDelDia(h.hora_inicio, h.hora_fin)) {
        const inicio = localAUtc(fecha, hhmm).getTime();
        const fin = inicio + DURACION_MIN * 60_000;
        if (inicio <= ahora) continue; // ya paso o es muy pronto
        const chocaConAlgo = ocupados.some(o => inicio < o.fin && fin > o.inicio);
        if (!chocaConAlgo) slotsLibres.push(hhmm);
      }
    }
    if (slotsLibres.length > 0) resultado.push({ fecha, slots: slotsLibres.sort() });
  }
  return resultado;
}
