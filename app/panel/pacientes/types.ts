export interface EstadoSolicitud {
  ok: boolean;
  error: string | null;
  url: string | null;
}

export const ESTADO_INICIAL_SOLICITUD: EstadoSolicitud = { ok: false, error: null, url: null };
