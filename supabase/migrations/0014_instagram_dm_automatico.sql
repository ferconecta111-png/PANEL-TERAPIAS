-- Automatizacion "comentario -> DM" de Instagram (reemplaza a ManyChat para
-- el caso puntual de regalar un lead magnet). Una fila por terapeuta, igual
-- patron que bold_identity_key: cada quien su propia cuenta de Instagram y
-- su propio token, nunca uno compartido.
create table if not exists ig_automatizaciones (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  ig_business_id text not null, -- Instagram Business Account ID (lo manda Meta en cada webhook)
  access_token text not null, -- token de la cuenta/pagina con permiso de mensajeria -- rotar aqui
  palabras_clave text[], -- null o vacio = cualquier comentario dispara el DM
  mensaje text not null, -- lo que recibe por DM quien comento
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ig_automatizaciones_business_idx on ig_automatizaciones(ig_business_id);

alter table ig_automatizaciones enable row level security;

drop policy if exists p_ig_automatizaciones_admin_all on ig_automatizaciones;
create policy p_ig_automatizaciones_admin_all on ig_automatizaciones for all to authenticated
  using (fn_es_admin())
  with check (fn_es_admin());

-- Idempotencia: Meta reintenta el mismo evento de webhook si no respondemos
-- a tiempo o si hay cualquier duda de entrega -- sin esto, un reintento
-- manda el mismo regalo dos veces al mismo comentario.
create table if not exists ig_eventos_procesados (
  comment_id text primary key,
  terapeuta_id uuid references terapeutas(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table ig_eventos_procesados enable row level security;

drop policy if exists p_ig_eventos_admin_all on ig_eventos_procesados;
create policy p_ig_eventos_admin_all on ig_eventos_procesados for all to authenticated
  using (fn_es_admin())
  with check (fn_es_admin());
