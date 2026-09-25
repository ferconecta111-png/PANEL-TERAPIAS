export interface EstadoCaso {
  ok: boolean;
  error: string | null;
}

export const ESTADO_INICIAL_CASO: EstadoCaso = { ok: false, error: null };
