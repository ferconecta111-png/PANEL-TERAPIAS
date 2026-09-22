-- Slug estable para cada terapeuta (ej. "elizabeth"), para poder ligar su
-- sitio público (eventos_pagina.sitio_slug) y el catálogo de productos del
-- endpoint /api/public/bold-link a su fila real, sin depender de su nombre.
alter table terapeutas add column if not exists slug text unique;
