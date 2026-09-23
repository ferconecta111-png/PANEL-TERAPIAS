-- Bitacora de soporte: consultas/problemas de un paciente que NO estan
-- ligados a un pago (a diferencia de solicitudes_pago). Pedido de Fernanda,
-- 23-sep-2026 — no existia ningun concepto de "caso" en el panel hasta hoy.
create table if not exists casos_soporte (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete set null,
  titulo text not null,
  descripcion text,
  estado text not null default 'abierto' check (estado in ('abierto', 'en_proceso', 'cerrado')),
  creado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cerrado_at timestamptz
);

create index if not exists idx_casos_soporte_terapeuta on casos_soporte(terapeuta_id, created_at desc);
create index if not exists idx_casos_soporte_estado on casos_soporte(estado);

alter table casos_soporte enable row level security;

-- Mismo criterio que pacientes/citas: cada terapeuta ve solo lo suyo, admin ve todo.
drop policy if exists casos_soporte_select on casos_soporte;
create policy casos_soporte_select on casos_soporte for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists casos_soporte_write on casos_soporte;
create policy casos_soporte_write on casos_soporte for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
