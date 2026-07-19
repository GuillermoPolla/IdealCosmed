USE agenda_estetica;

-- ============================================================
-- CONFIGURACIÓN INICIAL
-- ============================================================

INSERT INTO configuracion_agenda (
    id,
    dias_anticipacion_minima,
    minutos_reserva_temporal,
    zona_horaria
)
VALUES (
    1,
    2,
    30,
    'America/Montevideo'
)
ON DUPLICATE KEY UPDATE
    dias_anticipacion_minima = 2,
    minutos_reserva_temporal = 30,
    zona_horaria = 'America/Montevideo';


-- ============================================================
-- HORARIOS DE LUNES A VIERNES
-- 08:00, 09:00 y 10:00
-- ============================================================

INSERT INTO horarios_atencion (
    dia_semana,
    hora_inicio,
    hora_fin,
    duracion_turno_minutos,
    activo
)
VALUES
    (1, '08:00:00', '11:00:00', 60, TRUE),
    (2, '08:00:00', '11:00:00', 60, TRUE),
    (3, '08:00:00', '11:00:00', 60, TRUE),
    (4, '08:00:00', '11:00:00', 60, TRUE),
    (5, '08:00:00', '11:00:00', 60, TRUE)
ON DUPLICATE KEY UPDATE
    hora_inicio = '08:00:00',
    hora_fin = '11:00:00',
    duracion_turno_minutos = 60,
    activo = TRUE;


-- ============================================================
-- HORARIO DEL SÁBADO
-- 09:00 a 15:00; el último turno finaliza a las 16:00
-- ============================================================

INSERT INTO horarios_atencion (
    dia_semana,
    hora_inicio,
    hora_fin,
    duracion_turno_minutos,
    activo
)
VALUES (
    6,
    '09:00:00',
    '16:00:00',
    60,
    TRUE
)
ON DUPLICATE KEY UPDATE
    hora_inicio = '09:00:00',
    hora_fin = '16:00:00',
    duracion_turno_minutos = 60,
    activo = TRUE;