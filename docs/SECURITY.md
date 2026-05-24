# Seguridad

## Modelo QR antifraude

- Cada ticket tiene `qr_codes.token_hash` y estado.
- El QR visible contiene un token cifrado AES-256-GCM con `ticketId`, `eventId`, `nonce`, `iat`, `exp` y `kid`.
- El token se firma con HMAC SHA-256.
- La camara normal solo ve texto opaco; la validacion real vive en `/api/scans/validate`.
- Al primer escaneo valido se marca ticket y QR como usados en transaccion.
- Reescaneos, expiraciones y firmas invalidas se registran en `fraud_logs`.

## Controles incluidos

- Helmet, CORS estricto y rate limiting.
- JWT con expiracion, issuer y audience.
- bcrypt para password.
- Validacion con Zod.
- SQL parametrizado con `pg`.
- Logs de actividad y auditoria.
- Deteccion de multiples sesiones por `user_sessions`.
- Hooks para reCAPTCHA, OAuth Google/Apple y proveedores de pago.
- Auditoria admin de boletos en `admin_ticket_actions`.
- Sincronizacion offline con hash de lote para evitar replay accidental.
- Rooms Socket.io separadas por usuario, evento y administracion.

## Nota realista

Ninguna app puede impedir capturas de pantalla al 100% en todos los dispositivos. GEN reduce riesgo con QR dinamico, expiracion corta, token de un solo uso, device binding, marca visual animada y validacion obligatoria online.
