-- Pais del visitante, para la Analitica (pedido de Fernanda, 23-sep-2026).
-- Se llena con el header x-vercel-ip-country que Vercel manda gratis en cada
-- request — no hace falta ninguna libreria de geo-IP.
alter table eventos_pagina add column if not exists country text;
