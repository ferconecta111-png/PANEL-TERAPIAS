export interface EstadoTerapeuta {
  ok: boolean;
  error: string | null;
  mensaje: string | null;
}

export const ESTADO_INICIAL_TERAPEUTA: EstadoTerapeuta = { ok: false, error: null, mensaje: null };
