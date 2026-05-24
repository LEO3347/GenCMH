# GEN

GEN es una plataforma premium para fiestas, eventos y experiencias: venta de boletos, QR cifrados, app privada de staff, dashboard admin, perfiles, social feed, reservas, pagos y analítica.

## Arquitectura

- `apps/web`: Next.js, Tailwind, Framer Motion, Three.js y GSAP.
- `apps/api`: Node.js + Express con JWT, rate limiting, pagos, QR cifrado y validación staff.
- `apps/staff-mobile`: React Native/Expo para escaneo privado de entradas.
- `apps/user-mobile`: React Native/Expo para asistentes, offline-first, compras pick-up y QR de usuario.
- `packages/shared`: tipos compartidos.
- `infra/schema.sql`: modelo PostgreSQL completo.
- `docs`: manuales de instalación, despliegue, dominio y publicación móvil.
- `docs/ADMIN_OPERATIONS.md`: operaciones avanzadas de admin, QR perdido, mesas y realtime.

## Inicio rápido

1. Instala Node.js 20+, PostgreSQL 15+ y Expo CLI.
2. Copia variables:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Instala dependencias:

```bash
npm install
```

4. Crea la base y migra:

```bash
createdb gen
psql postgres://postgres:postgres@localhost:5432/gen -f infra/schema.sql
```

5. Arranca web + API:

```bash
npm run dev
```

6. Arranca app staff:

```bash
npm run dev:staff
```

Para la app de usuarios finales:

```bash
npm run dev:user
```

Web: `http://localhost:3000`  
API: `http://localhost:4000`

## Seguridad del QR

El QR no contiene datos legibles para cámaras normales. Contiene un token JWE-like propio firmado con HMAC SHA-256 y cifrado AES-256-GCM. La app staff envía el token al backend, donde se valida firma, expiración, estado, dispositivo, ubicación y uso único. Un QR usado queda invalidado y cualquier intento posterior genera `fraud_logs`.

## App de usuarios offline

La app de asistentes es independiente de la administración. Cachea eventos/productos, permite crear órdenes de bebidas/snacks sin internet y sincroniza por red local contra la API del organizador cuando el dispositivo vuelve a ver el servidor en Wi-Fi local. El chat queda exclusivamente en la app/plataforma de administración.

## Documentación

Lee [docs/INSTALL.md](docs/INSTALL.md), [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/MOBILE_RELEASE.md](docs/MOBILE_RELEASE.md) y [docs/SECURITY.md](docs/SECURITY.md).
