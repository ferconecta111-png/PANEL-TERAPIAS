-- Esquema inicial del Panel de Terapeutas.
-- Idempotente: usa "if not exists" en todo para poder correrse mas de una vez sin romper.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist"; -- necesaria para el exclude-constraint de citas (uuid = en un indice gist)

-- Perfiles de quien inicia sesion (admin = Fernanda, terapeuta = cada aliada).
-- Se crea automatico via trigger cuando alguien confirma su cuenta en auth.users.
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'terapeuta' check (role in ('admin', 'terapeuta')),
  nombre text,
  created_at timestamptz not null default now()
);

-- Cada terapeuta aliada (equivalente a "sellers" en vsl-platform).
create table if not exists terapeutas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  email text not null unique,
  whatsapp text,
  especialidades text,
  formacion text,
  anos_experiencia int,
  instagram text,
  foto_url text,
  precio_sesion_individual numeric(12,2),
  precio_paquete numeric(12,2),
  comision_porcentaje numeric(5,2) not null default 20,
  bold_identity_key text, -- llave publica de Bold de ESTA terapeuta (cada una su propia cuenta)
  bold_webhook_secret text, -- secreto para verificar la firma HMAC de SU webhook de Bold
  activa boolean not null default true,
  archivado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Horario semanal libre de cada terapeuta, para saber que huecos ofrecer.
create table if not exists horarios_terapeuta (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  dia_semana int not null check (dia_semana between 0 and 6), -- 0=domingo .. 6=sabado
  hora_inicio time not null,
  hora_fin time not null,
  created_at timestamptz not null default now()
);

-- Pacientes de cada terapeuta (equivalente a "leads").
create table if not exists pacientes (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid references terapeutas(id) on delete set null,
  nombre text not null,
  email text,
  telefono text,
  producto text, -- 'sesion_individual' | 'paquete' | texto libre
  estado text not null default 'nuevo' check (estado in ('nuevo', 'en_proceso', 'activo', 'cerrado', 'perdido')),
  origen text, -- de donde llego (instagram, referido, web, etc.)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Citas agendadas (calendario nativo, sin depender de GHL).
create table if not exists citas (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  estado text not null default 'agendada' check (estado in ('agendada', 'completada', 'cancelada', 'no_asistio')),
  notas_previas text,
  created_at timestamptz not null default now(),
  -- Dos citas de la misma terapeuta no pueden traslaparse en el tiempo.
  constraint citas_no_solape exclude using gist (
    terapeuta_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (estado = 'agendada')
);

-- Cada link de pago que se genera queda aqui ANTES de mandarselo al paciente,
-- con una referencia corta (Bold solo acepta 60 caracteres alfanumericos en
-- ese campo, no alcanzan dos UUID) que el webhook usa para saber a quien
-- pertenece el pago cuando Bold avisa que se aprobo.
create table if not exists solicitudes_pago (
  id uuid primary key default gen_random_uuid(),
  referencia text not null unique, -- lo que se manda en el campo "reference" de Bold
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  paciente_id uuid references pacientes(id) on delete set null,
  producto text,
  monto numeric(12,2) not null,
  moneda text not null default 'COP',
  bold_payment_link_id text,
  url_pago text,
  created_at timestamptz not null default now()
);

-- Pagos reales via Bold, llenados automatico por el webhook.
create table if not exists pagos_bold (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid references terapeutas(id) on delete set null,
  paciente_id uuid references pacientes(id) on delete set null,
  bold_payment_id text not null unique, -- para no duplicar si Bold reintenta el aviso
  monto numeric(12,2) not null,
  moneda text not null default 'COP',
  producto text,
  estado text not null default 'aprobado' check (estado in ('aprobado', 'rechazado', 'anulado')),
  payer_email text,
  raw_payload jsonb, -- el aviso completo de Bold, por si hace falta revisar despues
  created_at timestamptz not null default now()
);

-- Bitacora de seguimiento por paciente — visible para su terapeuta desde el celular.
create table if not exists notas_paciente (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references pacientes(id) on delete cascade,
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  nota text not null,
  created_at timestamptz not null default now()
);

-- Metricas de redes sociales por terapeuta (carga manual por ahora).
create table if not exists metricas_redes (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  fecha date not null,
  seguidores int,
  alcance int,
  interacciones int,
  created_at timestamptz not null default now(),
  unique (terapeuta_id, fecha)
);

create index if not exists idx_pacientes_terapeuta on pacientes(terapeuta_id);
create index if not exists idx_citas_terapeuta on citas(terapeuta_id);
create index if not exists idx_citas_paciente on citas(paciente_id);
create index if not exists idx_notas_paciente on notas_paciente(paciente_id);
create index if not exists idx_pagos_terapeuta on pagos_bold(terapeuta_id);
create index if not exists idx_solicitudes_terapeuta on solicitudes_pago(terapeuta_id);

-- ── RLS ──────────────────────────────────────────────────────────────
-- Una terapeuta solo ve SUS pacientes/citas/notas. El admin ve todo.

alter table profiles enable row level security;
alter table terapeutas enable row level security;
alter table horarios_terapeuta enable row level security;
alter table pacientes enable row level security;
alter table citas enable row level security;
alter table pagos_bold enable row level security;
alter table solicitudes_pago enable row level security;
alter table notas_paciente enable row level security;
alter table metricas_redes enable row level security;

create or replace function fn_es_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where user_id = auth.uid() and role = 'admin');
$$;

create or replace function fn_mi_terapeuta_id() returns uuid
language sql security definer stable set search_path = public as $$
  select id from terapeutas where user_id = auth.uid();
$$;

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select using (user_id = auth.uid() or fn_es_admin());

drop policy if exists terapeutas_select on terapeutas;
create policy terapeutas_select on terapeutas for select using (user_id = auth.uid() or fn_es_admin());
drop policy if exists terapeutas_write_admin on terapeutas;
create policy terapeutas_write_admin on terapeutas for all using (fn_es_admin()) with check (fn_es_admin());

drop policy if exists horarios_select on horarios_terapeuta;
create policy horarios_select on horarios_terapeuta for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists horarios_write on horarios_terapeuta;
create policy horarios_write on horarios_terapeuta for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());

drop policy if exists pacientes_select on pacientes;
create policy pacientes_select on pacientes for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists pacientes_write on pacientes;
create policy pacientes_write on pacientes for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());

drop policy if exists citas_select on citas;
create policy citas_select on citas for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists citas_write on citas;
create policy citas_write on citas for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());

drop policy if exists pagos_select on pagos_bold;
create policy pagos_select on pagos_bold for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());

drop policy if exists solicitudes_select on solicitudes_pago;
create policy solicitudes_select on solicitudes_pago for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists solicitudes_write on solicitudes_pago;
create policy solicitudes_write on solicitudes_pago for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());

drop policy if exists notas_select on notas_paciente;
create policy notas_select on notas_paciente for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists notas_write on notas_paciente;
create policy notas_write on notas_paciente for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());

drop policy if exists metricas_select on metricas_redes;
create policy metricas_select on metricas_redes for select using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
drop policy if exists metricas_write on metricas_redes;
create policy metricas_write on metricas_redes for all using (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin()) with check (terapeuta_id = fn_mi_terapeuta_id() or fn_es_admin());
