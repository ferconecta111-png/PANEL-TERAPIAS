export interface EstadoLogin {
  error: string | null;
}

export const ESTADO_INICIAL: EstadoLogin = { error: null };

export interface EstadoOlvide {
  error: string | null;
  enviado: boolean;
}

export const ESTADO_OLVIDE_INICIAL: EstadoOlvide = { error: null, enviado: false };
