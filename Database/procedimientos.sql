-- ============================================================
-- Agenda para centro estético
-- Procedimientos almacenados - Etapas 1 a 6
-- Compatible con MySQL 8.0+
-- ============================================================

USE agenda_estetica;

SET time_zone = '-03:00';


-- ============================================================
-- OBTENER HORARIOS DE UNA FECHA
--
-- Genera los horarios correspondientes al día consultado y
-- devuelve su estado: disponible, pendiente u ocupado.
--
-- No devuelve filas cuando:
--   - la fecha no cumple la anticipación mínima;
--   - ese día de la semana no se atiende;
--   - la fecha completa se encuentra bloqueada.
-- ============================================================

DROP PROCEDURE IF EXISTS obtener_horarios_fecha;

DELIMITER //

CREATE PROCEDURE obtener_horarios_fecha (
    IN p_fecha DATE
)
BEGIN
    IF p_fecha IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha es obligatoria';
    END IF;

    WITH RECURSIVE horarios_generados AS (
        -- Primer horario del día.
        SELECT
            ha.hora_inicio,
            ha.hora_fin AS hora_cierre,
            ha.duracion_turno_minutos
        FROM horarios_atencion AS ha
        INNER JOIN configuracion_agenda AS ca
            ON ca.id = 1
        WHERE ha.dia_semana = WEEKDAY(p_fecha) + 1
          AND ha.activo = TRUE
          AND p_fecha >= DATE_ADD(
                CURDATE(),
                INTERVAL ca.dias_anticipacion_minima DAY
              )
          AND NOT EXISTS (
                SELECT 1
                FROM fechas_bloqueadas AS fb
                WHERE fb.fecha = p_fecha
              )

        UNION ALL

        -- Siguientes horarios, según la duración configurada.
        SELECT
            ADDTIME(
                hg.hora_inicio,
                SEC_TO_TIME(hg.duracion_turno_minutos * 60)
            ),
            hg.hora_cierre,
            hg.duracion_turno_minutos
        FROM horarios_generados AS hg
        WHERE ADDTIME(
                hg.hora_inicio,
                SEC_TO_TIME(hg.duracion_turno_minutos * 60)
              ) < hg.hora_cierre
    )
    SELECT
        p_fecha AS fecha,
        hg.hora_inicio,
        ADDTIME(
            hg.hora_inicio,
            SEC_TO_TIME(hg.duracion_turno_minutos * 60)
        ) AS hora_fin,
        CASE
            WHEN t.estado = 'ocupado' THEN 'ocupado'
            WHEN t.estado = 'pendiente'
                 AND t.pendiente_hasta > CURRENT_TIMESTAMP
                THEN 'pendiente'
            ELSE 'disponible'
        END AS estado
    FROM horarios_generados AS hg
    LEFT JOIN turnos AS t
        ON t.fecha = p_fecha
       AND t.hora_inicio = hg.hora_inicio
    ORDER BY hg.hora_inicio;
END //

DELIMITER ;


-- ============================================================
-- RESERVAR UN TURNO TEMPORALMENTE
--
-- Registra el horario como pendiente durante la cantidad de
-- minutos indicada en configuracion_agenda.
--
-- Antes de insertar valida que:
--   - la fecha y la hora hayan sido recibidas;
--   - se cumpla la anticipación mínima;
--   - ese día se atienda;
--   - la fecha no esté bloqueada;
--   - la hora corresponda a uno de los bloques configurados;
--   - el turno no esté pendiente ni ocupado.
-- ============================================================

DROP PROCEDURE IF EXISTS reservar_turno_temporal;

DELIMITER //

CREATE PROCEDURE reservar_turno_temporal (
    IN p_fecha DATE,
    IN p_hora TIME
)
BEGIN
    DECLARE v_dias_anticipacion TINYINT UNSIGNED;
    DECLARE v_minutos_reserva SMALLINT UNSIGNED;
    DECLARE v_cantidad_horarios INT DEFAULT 0;
    DECLARE v_hora_apertura TIME;
    DECLARE v_hora_cierre TIME;
    DECLARE v_duracion_turno SMALLINT UNSIGNED;

    -- Si otro cliente reservó el mismo horario simultáneamente,
    -- la restricción UNIQUE (fecha, hora_inicio) produce el error 1062.
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El horario ya no está disponible';
    END;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_fecha IS NULL OR p_hora IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha y la hora son obligatorias';
    END IF;

    SELECT
        dias_anticipacion_minima,
        minutos_reserva_temporal
    INTO
        v_dias_anticipacion,
        v_minutos_reserva
    FROM configuracion_agenda
    WHERE id = 1;

    IF v_dias_anticipacion IS NULL OR v_minutos_reserva IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No existe la configuración de la agenda';
    END IF;

    IF p_fecha < DATE_ADD(
            CURDATE(),
            INTERVAL v_dias_anticipacion DAY
       ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha no cumple la anticipación mínima';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM fechas_bloqueadas
        WHERE fecha = p_fecha
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha seleccionada no está disponible';
    END IF;

    SELECT
        COUNT(*),
        MAX(hora_inicio),
        MAX(hora_fin),
        MAX(duracion_turno_minutos)
    INTO
        v_cantidad_horarios,
        v_hora_apertura,
        v_hora_cierre,
        v_duracion_turno
    FROM horarios_atencion
    WHERE dia_semana = WEEKDAY(p_fecha) + 1
      AND activo = TRUE;

    IF v_cantidad_horarios = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ese día de la semana no se atiende';
    END IF;

    IF p_hora < v_hora_apertura
       OR ADDTIME(
            p_hora,
            SEC_TO_TIME(v_duracion_turno * 60)
          ) > v_hora_cierre
       OR MOD(
            TIME_TO_SEC(TIMEDIFF(p_hora, v_hora_apertura)),
            v_duracion_turno * 60
          ) <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El horario seleccionado no es válido';
    END IF;

    START TRANSACTION;

    -- Permite reutilizar el horario cuando su reserva anterior venció.
    DELETE FROM turnos
    WHERE fecha = p_fecha
      AND hora_inicio = p_hora
      AND estado = 'pendiente'
      AND pendiente_hasta <= CURRENT_TIMESTAMP;

    INSERT INTO turnos (
        fecha,
        hora_inicio,
        estado,
        pendiente_hasta
    )
    VALUES (
        p_fecha,
        p_hora,
        'pendiente',
        DATE_ADD(
            CURRENT_TIMESTAMP,
            INTERVAL v_minutos_reserva MINUTE
        )
    );

    COMMIT;

    SELECT
        t.id,
        t.fecha,
        t.hora_inicio,
        ADDTIME(
            t.hora_inicio,
            SEC_TO_TIME(v_duracion_turno * 60)
        ) AS hora_fin,
        t.estado,
        t.pendiente_hasta
    FROM turnos AS t
    WHERE t.fecha = p_fecha
      AND t.hora_inicio = p_hora;
END //

DELIMITER ;


-- ============================================================
-- MARCAR UN TURNO COMO OCUPADO
--
-- Confirma una reserva pendiente que todavía no haya vencido.
-- pendiente_hasta pasa a NULL porque un turno ocupado no expira.
-- La nota es opcional y podrá contener, por ejemplo, el nombre
-- del cliente o "Confirmado por WhatsApp".
-- ============================================================

DROP PROCEDURE IF EXISTS marcar_turno_ocupado;

DELIMITER //

CREATE PROCEDURE marcar_turno_ocupado (
    IN p_fecha DATE,
    IN p_hora TIME,
    IN p_nota VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_fecha IS NULL OR p_hora IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha y la hora son obligatorias';
    END IF;

    START TRANSACTION;

    -- El UPDATE bloquea la fila mientras se realiza la confirmación.
    UPDATE turnos
    SET
        estado = 'ocupado',
        pendiente_hasta = NULL,
        nota_administrativa = NULLIF(TRIM(p_nota), '')
    WHERE fecha = p_fecha
      AND hora_inicio = p_hora
      AND estado = 'pendiente'
      AND pendiente_hasta > CURRENT_TIMESTAMP;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No existe una reserva pendiente vigente';
    END IF;

    COMMIT;

    SELECT
        id,
        fecha,
        hora_inicio,
        estado,
        pendiente_hasta,
        nota_administrativa
    FROM turnos
    WHERE fecha = p_fecha
      AND hora_inicio = p_hora;
END //

DELIMITER ;


-- ============================================================
-- LIBERAR UN TURNO
--
-- Elimina un turno pendiente u ocupado. Como los horarios
-- disponibles no se almacenan en la tabla turnos, al eliminar
-- la fila el horario vuelve automáticamente a estar disponible.
-- ============================================================

DROP PROCEDURE IF EXISTS liberar_turno;

DELIMITER //

CREATE PROCEDURE liberar_turno (
    IN p_fecha DATE,
    IN p_hora TIME
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_fecha IS NULL OR p_hora IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha y la hora son obligatorias';
    END IF;

    START TRANSACTION;

    DELETE FROM turnos
    WHERE fecha = p_fecha
      AND hora_inicio = p_hora;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El horario ya se encuentra disponible';
    END IF;

    COMMIT;

    SELECT
        p_fecha AS fecha,
        p_hora AS hora_inicio,
        'disponible' AS estado;
END //

DELIMITER ;


-- ============================================================
-- BLOQUEAR UNA FECHA COMPLETA
--
-- Impide mostrar horarios para un día excepcional en el que la
-- profesional no atenderá. Para proteger reservas existentes,
-- no permite bloquear una fecha que tenga turnos activos.
-- ============================================================

DROP PROCEDURE IF EXISTS bloquear_fecha;

DELIMITER //

CREATE PROCEDURE bloquear_fecha (
    IN p_fecha DATE,
    IN p_motivo VARCHAR(255)
)
BEGIN
    DECLARE EXIT HANDLER FOR 1062
    BEGIN
        ROLLBACK;

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha ya se encuentra bloqueada';
    END;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_fecha IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha es obligatoria';
    END IF;

    IF p_fecha < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede bloquear una fecha pasada';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM horarios_atencion
        WHERE dia_semana = WEEKDAY(p_fecha) + 1
          AND activo = TRUE
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ese día de la semana ya está cerrado';
    END IF;

    START TRANSACTION;

    -- Elimina reservas pendientes que ya hayan vencido.
    DELETE FROM turnos
    WHERE fecha = p_fecha
      AND estado = 'pendiente'
      AND pendiente_hasta <= CURRENT_TIMESTAMP;

    IF EXISTS (
        SELECT 1
        FROM turnos
        WHERE fecha = p_fecha
          AND (
                estado = 'ocupado'
                OR (
                    estado = 'pendiente'
                    AND pendiente_hasta > CURRENT_TIMESTAMP
                )
              )
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha tiene turnos activos; libérelos antes de bloquearla';
    END IF;

    INSERT INTO fechas_bloqueadas (
        fecha,
        motivo
    )
    VALUES (
        p_fecha,
        NULLIF(TRIM(p_motivo), '')
    );

    COMMIT;

    SELECT
        fecha,
        motivo,
        creado_en
    FROM fechas_bloqueadas
    WHERE fecha = p_fecha;
END //

DELIMITER ;


-- ============================================================
-- DESBLOQUEAR UNA FECHA
--
-- Elimina la excepción. Si el día pertenece al horario semanal,
-- sus horarios vuelven a mostrarse como disponibles.
-- ============================================================

DROP PROCEDURE IF EXISTS desbloquear_fecha;

DELIMITER //

CREATE PROCEDURE desbloquear_fecha (
    IN p_fecha DATE
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_fecha IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha es obligatoria';
    END IF;

    START TRANSACTION;

    DELETE FROM fechas_bloqueadas
    WHERE fecha = p_fecha;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La fecha no se encuentra bloqueada';
    END IF;

    COMMIT;

    SELECT
        p_fecha AS fecha,
        'desbloqueada' AS estado;
END //

DELIMITER ;


-- ============================================================
-- PRUEBAS MANUALES DE EJEMPLO
-- Utilizar fechas futuras que coincidan con cada caso.
-- ============================================================

-- Día de lunes a viernes:
 CALL obtener_horarios_fecha('2026-07-20');

-- Sábado:
-- CALL obtener_horarios_fecha('2026-07-25');

-- Domingo o fecha bloqueada: debe devolver cero filas.
CALL obtener_horarios_fecha('2026-07-26');

-- Crear una reserva pendiente durante 30 minutos:
-- CALL reservar_turno_temporal('2026-07-25', '10:00:00');

-- Consultar nuevamente la fecha para comprobar el estado:
-- CALL obtener_horarios_fecha('2026-07-25');

-- Confirmar la reserva pendiente desde la administración:
-- CALL marcar_turno_ocupado(
--     '2026-07-25',
--     '10:00:00',
--     'Confirmado por WhatsApp'
-- );

-- Consultar nuevamente: las 10:00 deben aparecer como ocupado.
-- CALL obtener_horarios_fecha('2026-07-25');

-- Liberar un turno pendiente u ocupado:
-- CALL liberar_turno('2026-07-25', '12:00:00');

-- Consultar nuevamente: las 12:00 deben aparecer disponibles.
-- CALL obtener_horarios_fecha('2026-07-25');

-- Bloquear un día completo sin turnos activos:
-- CALL bloquear_fecha('2026-07-28', 'La profesional no atiende');
      
-- La fecha bloqueada debe devolver cero horarios:
-- CALL obtener_horarios_fecha('2026-07-28');

-- Volver a habilitar la fecha:
-- CALL desbloquear_fecha('2026-07-28');

-- La fecha debe volver a mostrar sus horarios habituales:
-- CALL obtener_horarios_fecha('2026-07-28');