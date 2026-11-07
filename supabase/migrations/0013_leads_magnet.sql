-- Leads capturados por un lead magnet publico (ej. la meditacion de Adriana).
-- Separado de `pacientes` a proposito: esto es gente que todavia NO es
-- paciente, solo entrego sus datos a cambio de un regalo digital. Si mas
-- adelante agenda o paga, se da de alta como paciente aparte (igual que
-- `solicitudes_pago` no es lo mismo que un pago confirmado).
create table if not exists leads_magnet (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid references terapeutas(id) on delete set null,
  producto text not null, -- ej. 'meditacion_chakra_raiz'
  nombre text not null,
  email text not null,
  whatsapp text,
  pais text,
  created_at timestamptz not null default now()
);

create index if not exists leads_magnet_terapeuta_idx on leads_magnet(terapeuta_id);
create index if not exists leads_magnet_producto_idx on leads_magnet(producto);

alter table leads_magnet enable row level security;

drop policy if exists p_leads_magnet_admin_all on leads_magnet;
create policy p_leads_magnet_admin_all on leads_magnet for all to authenticated
  using (fn_es_admin())
  with check (fn_es_admin());
