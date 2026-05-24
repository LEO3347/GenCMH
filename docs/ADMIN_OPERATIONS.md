# Operaciones admin GEN

La administracion existente se mantiene como panel web. Las funciones nuevas viven en la API y en modulos visuales del panel.

## Roles

- `super_admin`: control total.
- `admin`: operacion global.
- `organizer`: eventos propios.
- `staff`: puerta y soporte.
- `security`: puerta, fraude y seguridad.
- `vendor`: productos, pick-up y entregas.
- `guest`: usuario final.

## Recuperacion de boletos

Caso: una persona llega y dice que compro pero no tiene QR.

Endpoints:

- `GET /api/admin/tickets/search?q=correo-nombre-telefono-id`
- `GET /api/admin/tickets/:ticketId`
- `POST /api/admin/tickets/:ticketId/show-qr`
- `POST /api/admin/tickets/:ticketId/resend-qr`
- `POST /api/admin/tickets/:ticketId/manual-validate`
- `POST /api/admin/tickets/:ticketId/invalidate`
- `POST /api/admin/tickets/:ticketId/refund`

Cada accion queda registrada en `admin_ticket_actions`.

## Tiempo real

Socket.io emite:

- `scan:accepted`
- `ticket:invalidated`
- `table:held`
- `table:reserved`
- `ticket:qr_resent`

Rooms:

- `join:admin`
- `join:event`
- `join:user`

## Mesas VIP

Tablas:

- `event_zones`
- `venue_tables`
- `table_reservations`

Endpoints:

- `GET /api/tables/events/:eventId/map`
- `POST /api/tables/:tableId/hold`
- `POST /api/tables/reservations/:reservationId/confirm`

## Staff offline

Si el escaner se queda sin conexion, la app staff guarda escaneos localmente y luego llama:

- `POST /api/scans/sync`

El backend invalida tickets en lote, registra duplicados como fraude y guarda `offline_scan_batches`.
