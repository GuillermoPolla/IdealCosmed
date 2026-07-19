USE agenda_estetica;

DROP EVENT IF EXISTS limpiar_reservas_vencidas;

CREATE EVENT limpiar_reservas_vencidas
ON SCHEDULE EVERY 1 MINUTE
STARTS CURRENT_TIMESTAMP
ENABLE
DO
    DELETE FROM turnos
    WHERE estado = 'pendiente'
      AND pendiente_hasta <= CURRENT_TIMESTAMP;

SHOW EVENTS FROM agenda_estetica;