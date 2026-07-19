# Frontend de la agenda del centro estético

Landing desarrollada con React y Vite. La sección Agenda consume el backend en
tiempo real y permite reservar temporalmente un horario antes de abrir
WhatsApp.

## 1. Configurar el entorno

Dentro de la carpeta `Front`, crea el archivo `.env`:

```powershell
Copy-Item .env.example .env
notepad .env
```

Completa:

```env
VITE_API_URL=http://localhost:3000
VITE_WHATSAPP_NUMBER=59899123456
```

El número debe incluir el código de país y no debe tener `+`, espacios ni
guiones. El número del ejemplo no es real: reemplázalo por el contacto de la
profesional.

Las variables que comienzan con `VITE_` forman parte del sitio público. No
coloques contraseñas, tokens ni el `JWT_SECRET` del backend en este archivo.

## 2. Instalar e iniciar

```powershell
npm.cmd install
npm.cmd run dev
```

Abre la dirección que indique Vite, normalmente:

```text
http://localhost:5173
```

El backend también debe estar funcionando en `http://localhost:3000`.

## 3. Flujo del calendario

1. El calendario permite elegir fechas desde dos días después de la fecha
   actual y deshabilita los domingos.
2. Al seleccionar un día consulta `GET /api/agenda/horarios`.
3. Los horarios pendientes u ocupados aparecen deshabilitados.
4. Al pulsar **Continuar por WhatsApp**, ejecuta primero
   `POST /api/agenda/reservas-temporales`.
5. Solo después de una reserva correcta abre WhatsApp con la fecha y la hora en
   el mensaje.
6. Si el cliente no confirma, MySQL libera el horario después de 30 minutos.

## 4. Pruebas y compilación

```powershell
npm.cmd test
npm.cmd run build
```

Las pruebas comprueban la generación de fechas del calendario. La compilación
verifica que React y Vite puedan crear la versión destinada a producción.
