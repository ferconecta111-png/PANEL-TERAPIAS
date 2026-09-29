export interface EstadoSolicitudCita {
  error: string | null;
  ok: boolean;
}

export const ESTADO_SOLICITUD_INICIAL: EstadoSolicitudCita = { error: null, ok: false };
