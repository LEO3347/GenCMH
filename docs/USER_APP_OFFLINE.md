# App de usuarios finales offline

## Objetivo

`apps/user-mobile` es una app separada de la administracion. Esta pensada para asistentes:

- Crear cuenta o iniciar sesion.
- Ver eventos disponibles.
- Guardar un manifiesto offline de eventos y productos.
- Comprar bebidas/snacks para pick-up sin hacer fila.
- Generar orden local aunque no haya internet.
- Sincronizar compras por Wi-Fi local contra la API principal.
- Mostrar QR de pick-up cuando la orden queda centralizada.

El chat no existe en esta app. Chat, historias operativas y comunicacion interna se mantienen en administracion/staff.

## Modo sin internet

La fiesta puede operar con una red local privada:

1. Una laptop o servidor del organizador corre la API y PostgreSQL.
2. Los telefonos se conectan al mismo Wi-Fi local.
3. La app usa `localApiUrl` de `apps/user-mobile/app.json`.
4. Si el servidor local no responde, la app guarda la orden en cola local.
5. Al volver la red local, el usuario toca `Sincronizar por red local`.

## Cuenta principal de pagos

Todas las ordenes de productos se registran en:

- `pickup_orders`
- `pickup_order_items`
- `payments`
- `merchant_accounts`

`merchant_accounts` representa la cuenta central del organizador o de GEN. El pago queda asociado a esa cuenta para liquidacion unificada.

## Configurar IP local

Edita:

```json
{
  "extra": {
    "apiUrl": "http://192.168.1.83:4000",
    "localApiUrl": "http://192.168.1.83:4000"
  }
}
```

Ejemplo:

```json
"localApiUrl": "http://192.168.1.25:4000"
```

La PC que corre la API debe permitir conexiones entrantes al puerto `4000`.

## Iniciar

```bash
npm run dev:api
npm run dev:user
```

En Expo, abre la app en el celular con Expo Go o emulador.

## Limitaciones reales

Una compra completamente offline no puede liquidar Stripe/PayPal/MercadoPago en ese instante, porque esos proveedores requieren red. GEN resuelve esto en dos fases:

1. Orden local con folio y estado `queued_offline`.
2. Sincronizacion local/online que centraliza la orden, descuenta stock y crea el registro de pago.

Para produccion, agrega una terminal de pago local, wallet prepago o autorizaciones previas antes del evento.
