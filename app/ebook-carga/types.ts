export interface EstadoSolicitudEbook {
  ok: boolean;
  error: string | null;
}

export const ESTADO_SOLICITUD_INICIAL: EstadoSolicitudEbook = { ok: false, error: null };
