# Instalacion

## Requisitos

- Node.js 20 o superior.
- PostgreSQL 15 o superior.
- Cuenta de Stripe, PayPal y MercadoPago para producción.
- Expo Go o emulador iOS/Android para staff.

## Variables principales

API (`apps/api/.env`):

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/gen
JWT_SECRET=replace-with-64-char-secret
QR_ENCRYPTION_KEY=replace-with-32-byte-base64-key
QR_SIGNING_SECRET=replace-with-64-char-secret
WEB_ORIGIN=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_xxx
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx
MERCADOPAGO_ACCESS_TOKEN=xxx
```

Web (`apps/web/.env.local`):

```env
NEXT_PUBLIC_API_URL= http://192.168.1.83:4000
```

## Comandos

```bash
npm install
createdb gen
psql postgres://postgres:postgres@localhost:5432/gen -f infra/schema.sql
psql postgres://postgres:postgres@localhost:5432/gen -f infra/seed.sql
npm run dev
```

Los usuarios seed usan password de demo `GenDemo123!`. Cambialos antes de exponer cualquier entorno.

Para app staff:

```bash
npm run dev:staff
```

Para app de usuarios finales:

```bash
npm run dev:user
```

Si la fiesta usa red local sin internet, cambia `localApiUrl` en `apps/user-mobile/app.json` a la IP de la computadora que ejecuta la API.

Para probar roles:

```text
admin@gen.mx / GenDemo123!
staff@gen.mx / GenDemo123!
security@gen.mx / GenDemo123!
vendor@gen.mx / GenDemo123!
fan@gen.mx / GenDemo123!
```
