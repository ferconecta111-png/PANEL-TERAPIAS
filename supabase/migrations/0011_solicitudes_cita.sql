-- Solicitudes de cita desde el link publico de agendamiento.
--
-- Por que una tabla aparte y no un estado nuevo en `citas`: `citas` ya tiene
-- un candado real (citas_no_solape) que asume que toda fila ahi es un
-- compromiso confirmado. Una solicitud pendiente todavia NO es una cita —
-- es solo un intento — y no queremos tocar el constraint ni el enum de una
-- tabla que ya funciona. Cuando la terapeuta acepta, ahi si se inserta la
-- fila real en `citas` (mismo camino que ya usa /panel/agenda).
--
-- Su propio candado (solicitudes_no_solape) evita que dos pacientes pidan
-- la misma hora al mismo tiempo mientras la terapeuta todavia no responde.
create table if not exists solicitudes_cita (
  id uuid primary key default gen_random_uuid(),
  terapeuta_id uuid not null references terapeutas(id) on delete cascade,
  paciente_id uuid not null references pacientes(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'rechazada')),
  cita_id uuid references citas(id) on delete set null, -- la cita real, una vez aceptada
  created_at timestamptz not null default now(),
  constraint solicitudes_no_solape exclude using gist (
    terapeuta_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (estado = 'pendiente')
);

create index if not exists idx_solicitudes_cita_terapeuta on solicitudes_cita(terapeuta_id, estado);

-- Sin policies de RLS a proposito: nada le pega a esta tabla desde el
-- navegador via PostgREST (ni el formulario publico ni el panel) — todo
-- pasa por Server Actions con el cliente admin (service role), mismo
-- patron que ya usa el resto de este proyecto para escritura privilegiada.
alter table solicitudes_cita enable row level security;
