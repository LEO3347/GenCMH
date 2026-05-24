# Publicacion App Store y Play Store

## Staff App

La app staff debe publicarse como aplicacion privada o no listada.

## User App

La app de usuarios finales vive en `apps/user-mobile` y se publica como app publica normal de GEN.

```bash
npm run dev:user
npx eas build --platform ios
npx eas build --platform android
```

Antes de publicar, configura `apiUrl` con el dominio publico y conserva `localApiUrl` para eventos offline con Wi-Fi privado.

## iOS

1. Crear Apple Developer Account.
2. Configurar Bundle ID `com.gen.staff`.
3. Activar Sign in with Apple si se usa en staff.
4. Generar build:

```bash
npx eas build --platform ios
```

5. Subir con EAS Submit o Transporter.
6. Publicar como Unlisted App o via Apple Business Manager.

## Android

1. Crear cuenta Google Play Console.
2. Configurar package `com.gen.staff`.
3. Generar build:

```bash
npx eas build --platform android
```

4. Publicar en Internal Testing, Closed Testing o Managed Google Play.

## Seguridad móvil

- Requerir login staff con rol.
- Pin biometrico para abrir escaner.
- Device binding por `deviceId`.
- Certificate pinning para API en builds nativas.
- Desactivar logs sensibles.
