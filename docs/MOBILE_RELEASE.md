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

## Build instalable para pruebas

La app de usuario ya apunta a la API publica:

```text
https://gen-api-2af9.onrender.com
```

Para generar un APK instalable sin depender de Expo Go ni de `exp://192...`:

```powershell
cd apps/user-mobile
npx eas login
npx eas build --platform android --profile preview
```

EAS dara una URL de descarga del APK. Esa URL se puede compartir para instalar en Android. Para iPhone se necesita TestFlight/App Store o una cuenta Apple Developer.

Si solo quieres probar en Expo Go desde otra red, usa tunel:

```powershell
cd apps/user-mobile
npm.cmd run start:tunnel
```

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
