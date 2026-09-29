export interface EstadoCuenta {
  error: string | null;
  ok: boolean;
}

export const ESTADO_CUENTA_INICIAL: EstadoCuenta = { error: null, ok: false };
