-- Hallazgo real (23-sep-2026): profiles solo tenia policy de SELECT, nunca
-- de INSERT — el auto-alta de "primer usuario = admin" en requireSesion()
-- fallaba en silencio contra la base real (el error no se revisaba), asi
-- que ningun perfil quedaba guardado de verdad pese a que el login parecia
-- funcionar. Se agrega el INSERT que faltaba: cada quien solo puede crear
-- SU PROPIA fila (no la de otro).
drop policy if exists profiles_insert_propio on profiles;
create policy profiles_insert_propio on profiles for insert with check (user_id = auth.uid());
