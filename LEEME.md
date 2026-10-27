# Planet Movil — stock, ventas y constancias

## Usar en local
```
npm install
npm run dev -- -p 3100      (o doble clic en iniciar.bat)
```
Abrir http://localhost:3100. La base de datos se crea sola en `data/planet.db` con las dos tiendas, el catálogo de modelos y estos usuarios:

| Perfil | Usuario | Contraseña |
|---|---|---|
| Administrador | `admin` | `admin123` |
| Administradora | `Rosa` | — (solo usuario) |
| Gerencia (consulta e informes) | `Jaime` | — (solo usuario) |
| Vendedora (Planet Movil) | `Milagros` | — (solo usuario) |

Cambia la contraseña de `admin` desde la sección Usuarios antes de usarlo en serio.

## Subir a Vercel
Vercel no guarda archivos, así que la base debe ser remota (Turso, plan gratis):
1. Crear la base en https://turso.tech (o con `turso db create planetmovil`) y copiar la **URL** (`libsql://...`) y un **token** (`turso db tokens create planetmovil`).
2. En Vercel: **Add New → Project →** importar el repositorio de GitHub.
3. En **Environment Variables** agregar (ver `.env.example`): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET` (texto largo aleatorio), `ADMIN_PASSWORD` (contraseña del usuario `admin`) y `COOKIE_SECURE=true`.
4. **Deploy.** Las tablas, las tiendas, el catálogo y los usuarios iniciales se crean solos en el primer acceso.

Con HTTPS (Vercel) también funciona el escáner por cámara del celular. Con la pistola lectora no hace falta nada: escribe el código y envía Enter.

> Ojo: Rosa, Jaime y Milagros entran solo con su usuario. En internet cualquiera que adivine el nombre podría entrar; conviene asignarles contraseña en **Usuarios** antes de publicar.
