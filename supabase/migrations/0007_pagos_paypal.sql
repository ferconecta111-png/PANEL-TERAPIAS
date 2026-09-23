-- Pagos via PayPal, respaldo cuando Bold rechaza tarjetas internacionales
-- (22-sep-2026). Misma forma que pagos_bold, tabla separada porque son
-- pasarelas distintas con datos distintos (aca no hay payer_phone, PayPal
-- no lo entrega salvo que el comprador lo tenga guardado en su cuenta).
create table if not exists pagos_paypal (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid references terapeutas(id) on delete set null,
  paypal_order_id text not null unique,
  paypal_capture_id text,
  monto numeric(12,2) not null,
  moneda text not null default 'USD',
  producto text,
  estado text not null default 'aprobado' check (estado in ('aprobado', 'rechazado')),
  payer_email text,
  payer_nombre text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_pagos_paypal_terapeuta on pagos_paypal(terapeuta_id);

alter table pagos_paypal enable row level security;
drop policy if exists pagos_paypal_select on pagos_paypal;
create policy pagos_paypal_select on pagos_paypal for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
