-- Pedido de Fernanda (22-sep-2026): capturar nombre/telefono/pais del
-- comprador ANTES de mandarlo a pagar (Bold o PayPal) — asi se tiene el
-- dato de contacto pase lo que pase con el pago, sin depender de que la
-- pasarela lo entregue (Bold no lo confirma, PayPal solo a veces).
alter table solicitudes_pago add column if not exists comprador_nombre text;
alter table solicitudes_pago add column if not exists comprador_telefono text;
alter table solicitudes_pago add column if not exists comprador_pais text;
alter table solicitudes_pago add column if not exists pasarela text not null default 'bold' check (pasarela in ('bold', 'paypal'));
