# Panel de Terapeutas

Panel para dar de alta terapeutas aliadas, asignarles pacientes, ver su
agenda, rastrear pagos de Bold en automático y llevar notas de seguimiento
por paciente. Next.js + Supabase, mismo patrón que vsl-platform pero como
proyecto 100% independiente.

## Arrancar en local

1. Copia `.env.local.example` a `.env.local` y llénalo con las credenciales
   de tu propio proyecto de Supabase (Settings → API).
2. Corre el esquema de `supabase/migrations/0001_esquema_inicial.sql` en el
   SQL Editor de ese proyecto (es idempotente, se puede correr más de una vez).
3. `npm install`
4. `npm run dev`

## Cómo se da de alta una terapeuta

Desde `/panel/terapeutas` (solo admin), se le manda una invitación real por
correo (Supabase Auth) — ella misma crea su contraseña, nunca se comparte
una generada aquí. El primer usuario que confirma su cuenta en un proyecto
nuevo se vuelve automáticamente `admin`.

## Cómo se conecta Bold por terapeuta

Cada terapeuta usa **su propia cuenta de Bold** (nunca una compartida):

1. Guardarle su `bold_identity_key` (llave pública, la de su cuenta) y
   `bold_webhook_secret` en su fila de la tabla `terapeutas`.
2. Ella (o quien administre su cuenta de Bold) registra este webhook en su
   **Panel de Comercios de Bold → Integraciones → Webhooks**:
   `https://<tu-dominio>/api/webhooks/bold/<su-terapeuta-id>`
3. Desde la ficha de cada paciente se genera el link de pago (usa la llave
   de esa terapeuta); cuando el paciente paga, Bold avisa solo y el pago
   queda registrado automático en `pagos_bold`, ya ligado al paciente
   correcto.

**Ojo con los montos:** para USD, la API de Bold cobra el monto tal cual en
dólares enteros, NO en centavos (aunque su documentación dice lo contrario —
confirmado con un error real: enviar 7500 cobró $7,500 USD en vez de $75).
No confirmado si COP se comporta igual — probar con un link de bajo monto
antes de confiar en un monto grande.

## Estructura de datos

Ver `supabase/migrations/0001_esquema_inicial.sql` — tablas principales:
`terapeutas`, `pacientes`, `citas`, `solicitudes_pago`, `pagos_bold`,
`notas_paciente`, `metricas_redes`. RLS ya configurado: cada terapeuta solo
ve lo suyo, el admin ve todo.

## Pendiente (fase 2)

- Métricas de redes sociales: hoy es solo una tabla para carga manual — se
  puede automatizar más adelante conectando la API de Meta si hace falta.
- Vista de "huecos libres" por terapeuta antes de agendar (hoy el
  formulario de agendar no filtra por horario cargado, solo bloquea
  choques exactos de horario vía el constraint de la base de datos).
