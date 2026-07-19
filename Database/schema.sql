-- ============================================================
-- Agenda para centro estético
-- Esquema inicial compatible con MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS agenda_estetica
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE agenda_estetica;

-- Montevideo utiliza UTC-03:00. El backend deberá configurar también
-- esta zona horaria en cada conexión a MySQL.
SET time_zone = '-03:00';


-- ============================================================
-- CONFIGURACIÓN GENERAL DE LA AGENDA
-- Solo existirá una fila, identificada con id = 1.
-- ============================================================

CREATE TABLE IF NOT EXISTS configuracion_agenda (
    id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    dias_anticipacion_minima TINYINT UNSIGNED NOT NULL DEFAULT 2,
    minutos_reserva_temporal SMALLINT UNSIGNED NOT NULL DEFAULT 30,
    zona_horaria VARCHAR(64) NOT NULL DEFAULT 'America/Montevideo',
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_configuracion_agenda
        PRIMARY KEY (id),
    CONSTRAINT chk_configuracion_agenda_id
        CHECK (id = 1),
    CONSTRAINT chk_dias_anticipacion
        CHECK (dias_anticipacion_minima > 0),
    CONSTRAINT chk_minutos_reserva
        CHECK (minutos_reserva_temporal > 0)
);


-- ============================================================
-- ADMINISTRADORES
-- La contraseña nunca se guarda en texto plano.
-- password_hash almacenará el hash generado con bcrypt desde Node.
-- ============================================================

CREATE TABLE IF NOT EXISTS administradores (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre_usuario VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso DATETIME NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_administradores
        PRIMARY KEY (id),
    CONSTRAINT uq_administradores_nombre_usuario
        UNIQUE (nombre_usuario)
);


-- ============================================================
-- HORARIOS SEMANALES DE ATENCIÓN
-- dia_semana: 1 = lunes, 2 = martes, ... 7 = domingo.
-- Los horarios disponibles se generan a partir de estas reglas.
-- ============================================================

CREATE TABLE IF NOT EXISTS horarios_atencion (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    dia_semana TINYINT UNSIGNED NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_turno_minutos SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_horarios_atencion
        PRIMARY KEY (id),
    CONSTRAINT uq_horarios_atencion_dia
        UNIQUE (dia_semana),
    CONSTRAINT chk_horarios_dia_semana
        CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT chk_horarios_horas
        CHECK (hora_fin > hora_inicio),
    CONSTRAINT chk_horarios_duracion
        CHECK (duracion_turno_minutos > 0)
);


-- ============================================================
-- FECHAS BLOQUEADAS
-- Una fila representa un día completo en el que no se atiende.
-- Eliminar la fila vuelve a habilitar la fecha.
-- ============================================================

CREATE TABLE IF NOT EXISTS fechas_bloqueadas (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    fecha DATE NOT NULL,
    motivo VARCHAR(255) NULL,
    bloqueada_por_admin_id INT UNSIGNED NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_fechas_bloqueadas
        PRIMARY KEY (id),
    CONSTRAINT uq_fechas_bloqueadas_fecha
        UNIQUE (fecha),
    CONSTRAINT fk_fechas_bloqueadas_admin
        FOREIGN KEY (bloqueada_por_admin_id)
        REFERENCES administradores (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);


-- ============================================================
-- TURNOS
-- No se guarda una fila para el estado "disponible".
-- Un horario es disponible cuando:
--   1. pertenece al horario semanal;
--   2. la fecha no está bloqueada;
--   3. no tiene un turno ocupado ni una reserva pendiente vigente.
-- ============================================================

CREATE TABLE IF NOT EXISTS turnos (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    estado ENUM('pendiente', 'ocupado') NOT NULL,
    pendiente_hasta DATETIME NULL,
    nota_administrativa VARCHAR(255) NULL,
    modificado_por_admin_id INT UNSIGNED NULL,
    creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_turnos
        PRIMARY KEY (id),
    CONSTRAINT uq_turnos_fecha_hora
        UNIQUE (fecha, hora_inicio),
    CONSTRAINT chk_turnos_estado_vencimiento
        CHECK (
            (estado = 'pendiente' AND pendiente_hasta IS NOT NULL)
            OR
            (estado = 'ocupado' AND pendiente_hasta IS NULL)
        ),
    CONSTRAINT fk_turnos_admin
        FOREIGN KEY (modificado_por_admin_id)
        REFERENCES administradores (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

CREATE INDEX idx_turnos_estado_pendiente_hasta
    ON turnos (estado, pendiente_hasta);


-- ============================================================
-- VISTA DE TURNOS ACTIVOS
-- Las reservas pendientes vencidas no aparecen en esta vista.
-- ============================================================

CREATE OR REPLACE VIEW turnos_activos AS
SELECT
    id,
    fecha,
    hora_inicio,
    estado,
    pendiente_hasta,
    nota_administrativa,
    modificado_por_admin_id,
    creado_en,
    actualizado_en
FROM turnos
WHERE estado = 'ocupado'
   OR (
        estado = 'pendiente'
        AND pendiente_hasta > CURRENT_TIMESTAMP
   );