-- Analitica de las paginas de cada terapeuta: visitas, profundidad de scroll
-- (para ver donde se queda/abandona la gente) y clics en los botones de
-- compra. Pensado para varios sitios (Elizabeth, Adriana, etc.), cada uno
-- identificado por su propio "sitio_slug" - no requiere que el sitio viva
-- en este mismo proyecto ni que la terapeuta tenga cuenta en el panel.

create table if not exists eventos_pagina (
  id uuid primary key default gen_random_uuid(),
  sitio_slug text not null,          -- ej. 'elizabeth', 'adriana' - identifica de que pagina viene
  session_id text not null,          -- generado en el navegador, agrupa los eventos de una misma visita
  tipo text not null check (tipo in ('vista', 'scroll_25', 'scroll_50', 'scroll_75', 'scroll_100', 'click_compra')),
  etiqueta text,                     -- para click_compra: que boton (ej. 'paquete_x3', 'sesion_individual')
  pagina text,                       -- ruta de la pagina (por si un sitio tiene mas de una)
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_eventos_sitio on eventos_pagina(sitio_slug, created_at);
create index if not exists idx_eventos_session on eventos_pagina(session_id);
create index if not exists idx_eventos_tipo on eventos_pagina(sitio_slug, tipo);

alter table eventos_pagina enable row level security;

-- Nadie autenticado necesita leer esto via el cliente normal (RLS) - el
-- panel siempre lee esta tabla con el cliente admin (service_role) desde el
-- servidor, y el endpoint publico de tracking TAMBIEN usa admin para
-- insertar. No hace falta ninguna policy de select/insert para anon/authenticated.
