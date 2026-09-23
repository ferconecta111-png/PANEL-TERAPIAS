-- Bold pide el numero de celular en su checkout — lo guardamos si el webhook
-- lo manda, para poder contactar a quien le rechazaron el pago (pedido de
-- Fernanda, 22-sep-2026).
alter table pagos_bold add column if not exists payer_phone text;
