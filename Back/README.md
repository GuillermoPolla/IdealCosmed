# Backend de la agenda del centro estético

API construida con Node.js, Express y MySQL para gestionar la disponibilidad de
una profesional.

## Funciones incluidas

- conexión mediante un pool de MySQL;
- zona horaria de Montevideo;
- consulta pública de horarios por fecha;
- reservas temporales durante 30 minutos;
- creación de administradores con contraseñas cifradas mediante bcrypt;
- inicio de sesión y autorización mediante JWT;
- rutas protegidas para ocupar o liberar turnos;
- rutas protegidas para bloquear o desbloquear fechas;
- límites de solicitudes para el login y las reservas públicas;
- validaciones y respuestas de error uniformes;
- pruebas automáticas que no modifican la base de datos.

La API utiliza los procedimientos almacenados que ya existen en la base
`agenda_estetica`.

## 1. Requisitos

- Node.js 20.19 o superior;
- MySQL 8 en funcionamiento;
- base `agenda_estetica`, tablas, procedimientos y evento ya instalados.

## 2. Instalar las dependencias

Desde PowerShell, dentro de la carpeta `backend`:

```powershell
npm.cmd install
```

## 3. Configurar las variables privadas

La primera vez, crea `.env` a partir del ejemplo:

```powershell
Copy-Item .env.example .env
notepad .env
```

Completa la conexión con los datos que utilizas en MySQL Workbench:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_CONTRASEÑA_DE_MYSQL
DB_NAME=agenda_estetica
```

Si MySQL no tiene contraseña, deja `DB_PASSWORD=` vacío.

Genera un secreto aleatorio para las sesiones administrativas:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `.env`:

```env
JWT_SECRET=EL_RESULTADO_GENERADO
JWT_EXPIRES_IN=8h
```

El archivo `.env` está ignorado por Git y no debe compartirse ni subirse a
internet.

## 4. Crear el administrador inicial

Completa temporalmente estas dos variables en `.env`:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=UNA_CONTRASEÑA_SEGURA_DE_AL_MENOS_10_CARACTERES
```

Ejecuta:

```powershell
npm.cmd run crear-admin
```

El comando crea el administrador o actualiza su contraseña si el usuario ya
existía. Luego elimina el valor de `ADMIN_PASSWORD` del `.env`; el hash seguro
ya quedó almacenado en MySQL.

## 5. Iniciar el backend

```powershell
npm.cmd run dev
```

Cuando la conexión sea correcta aparecerá:

```text
MySQL conectado a la base agenda_estetica
Backend disponible en http://localhost:3000
```

Prueba de salud:

```text
http://localhost:3000/api/salud
```

## 6. Rutas públicas

### Consultar horarios

```http
GET /api/agenda/horarios?fecha=2026-07-25
```

### Crear una reserva temporal

```http
POST /api/agenda/reservas-temporales
Content-Type: application/json

{
  "fecha": "2026-07-25",
  "hora": "10:00"
}
```

Cuando conectemos el frontend, esta solicitud se ejecutará al pulsar
**Continuar por WhatsApp**. WhatsApp se abrirá únicamente si MySQL pudo dejar el
horario pendiente.

## 7. Iniciar sesión como administrador

```http
POST /api/admin/login
Content-Type: application/json

{
  "nombreUsuario": "admin",
  "password": "TU_CONTRASEÑA"
}
```

La respuesta contiene un `token`. Las demás rutas administrativas deben enviar:

```http
Authorization: Bearer TOKEN_RECIBIDO
```

El token vence después del tiempo configurado en `JWT_EXPIRES_IN`.

## 8. Rutas administrativas protegidas

### Confirmar un turno pendiente

```http
PATCH /api/admin/turnos/ocupar

{
  "fecha": "2026-07-25",
  "hora": "10:00",
  "nota": "Confirmado por WhatsApp"
}
```

### Liberar un turno

```http
POST /api/admin/turnos/liberar

{
  "fecha": "2026-07-25",
  "hora": "10:00"
}
```

### Bloquear una fecha

```http
POST /api/admin/fechas/bloquear

{
  "fecha": "2026-07-27",
  "motivo": "La profesional no atiende"
}
```

### Desbloquear una fecha

```http
POST /api/admin/fechas/desbloquear

{
  "fecha": "2026-07-27"
}
```

## 9. Ejecutar las pruebas

```powershell
npm.cmd test
```

Las pruebas verifican la salud de la API, las validaciones, las rutas
inexistentes y la protección de las acciones administrativas. No insertan ni
eliminan turnos de MySQL.

## Próxima etapa

Crear el calendario en React, conectarlo con las rutas públicas y construir el
panel visual de administración sobre las rutas protegidas.
