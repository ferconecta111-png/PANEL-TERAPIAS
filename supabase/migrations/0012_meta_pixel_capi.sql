-- Pixel de Meta + API de Conversiones, por terapeuta (mismo patron que
-- bold_identity_key/bold_webhook_secret: cada terapeuta su propia cuenta).
alter table terapeutas add column if not exists meta_pixel_id text;
alter table terapeutas add column if not exists meta_capi_token text;

-- Datos del navegador del comprador (fbp/fbc + event_id de InitiateCheckout)
-- para que el evento Purchase server-side (webhook de Bold) se pueda
-- emparejar con la sesion real de Meta Ads en vez de mandarse "a ciegas".
alter table solicitudes_pago add column if not exists meta_fbp text;
alter table solicitudes_pago add column if not exists meta_fbc text;
alter table solicitudes_pago add column if not exists meta_event_id text;
