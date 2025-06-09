# Instalación y despliegue

Este proyecto está compuesto por un servidor Express escrito en TypeScript y un cliente React. A continuación se describe cómo ponerlo en marcha desde cero en un entorno externo.

## Requisitos previos

- **Node.js 20+**
- **PostgreSQL 16+**
- Acceso a una terminal para ejecutar `npm` y `node`

También se necesitan las siguientes variables de entorno:

```bash
DATABASE_URL=<cadena de conexión a PostgreSQL>
SESSION_SECRET=<clave secreta para las sesiones>
```

## Pasos de instalación

1. Clonar el repositorio y entrar en él:
   ```bash
   git clone <URL-del-repositorio>
   cd maiello2
   ```
2. Instalar las dependencias de Node:
   ```bash
   npm install
   ```
3. Configurar las variables de entorno mencionadas en la sección anterior.
4. Crear la base de datos y aplicar las migraciones:
   ```bash
   npx tsx migrate.ts
   ```
   Este script ejecuta las migraciones ubicadas en `migrations/` y crea un usuario administrador por defecto.
5. Iniciar el modo desarrollo:
   ```bash
   npm run dev
   ```
   La API y el cliente se sirven en el puerto `5000`.
6. Para un despliegue en producción primero compilar y luego arrancar:
   ```bash
   npm run build
   npm run start
   ```
   Los archivos estáticos se generan en `dist/public` y el servidor empaquetado se ubica en `dist/`.

## Dependencias del proyecto

A continuación se listan todas las dependencias declaradas en `package.json`:

### Dependencias principales

- @hookform/resolvers
- @jridgewell/trace-mapping
- @neondatabase/serverless
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-avatar
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toast
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- @sendgrid/mail
- @tailwindcss/vite
- @tanstack/react-query
- @types/multer
- aos
- class-variance-authority
- clsx
- cmdk
- connect-pg-simple
- date-fns
- drizzle-orm
- drizzle-zod
- embla-carousel-react
- express
- express-session
- framer-motion
- input-otp
- lucide-react
- memorystore
- multer
- next-themes
- passport
- passport-local
- postgres
- react
- react-day-picker
- react-dom
- react-hook-form
- react-icons
- react-resizable-panels
- recharts
- swiper
- tailwind-merge
- tailwindcss-animate
- tw-animate-css
- vaul
- wouter
- ws
- zod
- zod-validation-error

### Dependencias de desarrollo

- @replit/vite-plugin-cartographer
- @replit/vite-plugin-runtime-error-modal
- @tailwindcss/typography
- @types/connect-pg-simple
- @types/express
- @types/express-session
- @types/node
- @types/passport
- @types/passport-local
- @types/react
- @types/react-dom
- @types/ws
- @vitejs/plugin-react
- autoprefixer
- drizzle-kit
- esbuild
- postcss
- tailwindcss
- tsx
- typescript
- vite

### Dependencia opcional

- bufferutil

Todas estas dependencias se instalan automáticamente al ejecutar `npm install`.

## Notas adicionales

- El servidor escucha siempre en el puerto **5000**.
- Los archivos subidos se guardan en `public/uploads`.
- El cliente se encuentra dentro de la carpeta `client/` y se compila con Vite.

