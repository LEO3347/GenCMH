# Despliegue

## API publica rapida en Render

Para que la gente pueda entrar a cualquier hora, usa planes pagados/always-on en Render para `gen-api`, `gen-web` y `gen-postgres`. Los planes gratis pueden dormir servicios y la base gratis expira; sirven para pruebas, no para operacion permanente.

El repo incluye `render.yaml` para crear:

- `gen-api`: servicio web Docker.
- `gen-postgres`: Postgres administrado.

Pasos:

1. Sube este proyecto a GitHub.
2. En Render, crea un Blueprint desde ese repo.
3. Render detecta `render.yaml` en la raiz.
4. Llena los secretos cuando Render los pida:

```env
JWT_SECRET=usa-un-secreto-largo-de-64-caracteres-o-mas
QR_ENCRYPTION_KEY=base64-de-32-bytes
QR_SIGNING_SECRET=otro-secreto-largo
STRIPE_SECRET_KEY=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
MERCADOPAGO_ACCESS_TOKEN=
```

Para generar `QR_ENCRYPTION_KEY` en PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

Despues del primer deploy, carga el schema y datos iniciales en la base de Render. Copia la External Database URL de Render y ejecuta:

```powershell
$env:DATABASE_URL="TU_RENDER_DATABASE_URL_EXTERNA"
npm.cmd run db:setup
```

Prueba la API:

```powershell
Invoke-RestMethod https://TU_API_RENDER.onrender.com/health
```

Cuando responda `{ ok: true }`, cambia `apiUrl` y `localApiUrl` en `apps/user-mobile/app.json` a esa URL publica.

## Web en Vercel

1. Crea un proyecto Vercel apuntando a `apps/web`.
2. Configura `NEXT_PUBLIC_API_URL=https://api.tudominio.com`.
3. Activa build command `npm run build -w @gen/web`.
4. Output default de Next.js.

## API en AWS

Opcion recomendada: ECS Fargate + RDS PostgreSQL + ElastiCache Redis.

1. Crea RDS PostgreSQL con backups, encryption at rest y private subnet.
2. Construye imagen Docker desde `apps/api`.
3. Despliega en ECS Fargate detras de Application Load Balancer.
4. Usa AWS Secrets Manager para JWT, claves QR y credenciales de pago.
5. Configura WAF con reglas anti bot y rate limiting.

## Firebase

Firebase sirve para push notifications, Dynamic Links y crash reporting de la app staff. No lo uses como fuente principal de boletos; el backend PostgreSQL debe seguir siendo autoridad.

## Dominio

1. DNS:
   - `www.tudominio.com` CNAME a Vercel.
   - `api.tudominio.com` CNAME al ALB de AWS.
2. TLS:
   - Vercel gestiona certificado web.
   - AWS Certificate Manager para API.
3. CORS:
   - `WEB_ORIGIN=https://www.tudominio.com`.
