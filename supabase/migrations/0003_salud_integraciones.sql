-- Estado de salud de integraciones externas (ej. llave de Bold rotada sin
-- aviso) para poder avisar por notificación push solo en el CAMBIO de
-- estado (ok->roto o roto->ok), no en cada chequeo del cron.
create table if not exists salud_integraciones (
  id text primary key,
  ok boolean not null default true,
  detalle text,
  updated_at timestamptz not null default now()
);

alter table salud_integraciones enable row level security;

-- Sin policies para anon/authenticated: solo se toca vía service_role
-- (la ruta de cron), igual que eventos_pagina.
