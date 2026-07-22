import { pool } from "../config/database.js";
import { AppError } from "../utils/AppError.js";

function obtenerPrimerResultado(resultSets) {
  if (!Array.isArray(resultSets) || !Array.isArray(resultSets[0])) {
    return [];
  }

  return resultSets[0];
}

export async function buscarAdministradorPorUsuario(nombreUsuario) {
  const [rows] = await pool.execute(
    `SELECT id, nombre_usuario, password_hash, activo
     FROM administradores
     WHERE nombre_usuario = ?
     LIMIT 1`,
    [nombreUsuario],
  );

  return rows[0];
}

export async function buscarAdministradorActivoPorId(id) {
  const [rows] = await pool.execute(
    `SELECT id, nombre_usuario
     FROM administradores
     WHERE id = ? AND activo = TRUE
     LIMIT 1`,
    [id],
  );

  return rows[0];
}

export async function registrarUltimoAcceso(id) {
  await pool.execute(
    "UPDATE administradores SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?",
    [id],
  );
}

export async function buscarAgendaAdministrativa(fecha) {
  const [bloqueos] = await pool.execute(
    `SELECT fecha, motivo, creado_en
     FROM fechas_bloqueadas
     WHERE fecha = ?
     LIMIT 1`,
    [fecha],
  );

  const [horarios] = await pool.execute(
    `WITH RECURSIVE horarios_generados AS (
       SELECT
         ha.hora_inicio,
         ha.hora_fin AS hora_cierre,
         ha.duracion_turno_minutos
       FROM horarios_atencion AS ha
       WHERE ha.dia_semana = WEEKDAY(?) + 1
         AND ha.activo = TRUE

       UNION ALL

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
       ? AS fecha,
       hg.hora_inicio,
       ADDTIME(
         hg.hora_inicio,
         SEC_TO_TIME(hg.duracion_turno_minutos * 60)
       ) AS hora_fin,
       CASE
         WHEN t.estado = 'ocupado' THEN 'ocupado'
         WHEN t.estado = 'pendiente'
              AND t.pendiente_hasta > CURRENT_TIMESTAMP THEN 'pendiente'
         ELSE 'disponible'
       END AS estado,
       CASE
         WHEN t.estado = 'pendiente'
              AND t.pendiente_hasta > CURRENT_TIMESTAMP
           THEN t.pendiente_hasta
         ELSE NULL
       END AS pendiente_hasta,
       CASE
         WHEN t.estado = 'ocupado' THEN t.nota_administrativa
         ELSE NULL
       END AS nota_administrativa
     FROM horarios_generados AS hg
     LEFT JOIN turnos AS t
       ON t.fecha = ?
      AND t.hora_inicio = hg.hora_inicio
     ORDER BY hg.hora_inicio`,
    [fecha, fecha, fecha],
  );

  return {
    bloqueo: bloqueos[0] ?? null,
    horarios,
  };
}

export async function ocuparTurno(fecha, hora, nota, administradorId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [horariosValidos] = await connection.execute(
      `SELECT ha.id
       FROM horarios_atencion AS ha
       WHERE ha.dia_semana = WEEKDAY(?) + 1
         AND ha.activo = TRUE
         AND ? >= CURDATE()
         AND ? >= ha.hora_inicio
         AND ADDTIME(
           ?,
           SEC_TO_TIME(ha.duracion_turno_minutos * 60)
         ) <= ha.hora_fin
         AND MOD(
           TIME_TO_SEC(TIMEDIFF(?, ha.hora_inicio)),
           ha.duracion_turno_minutos * 60
         ) = 0
         AND NOT EXISTS (
           SELECT 1
           FROM fechas_bloqueadas AS fb
           WHERE fb.fecha = ?
         )
       LIMIT 1
       FOR UPDATE`,
      [fecha, fecha, hora, hora, hora, fecha],
    );

    if (horariosValidos.length === 0) {
      throw new AppError(
        "El horario no pertenece a la agenda o la fecha está bloqueada",
        409,
      );
    }

    await connection.execute(
      `INSERT INTO turnos (
         fecha,
         hora_inicio,
         estado,
         pendiente_hasta,
         nota_administrativa,
         modificado_por_admin_id
       )
       VALUES (?, ?, 'ocupado', NULL, NULLIF(TRIM(?), ''), ?)
       ON DUPLICATE KEY UPDATE
         estado = 'ocupado',
         pendiente_hasta = NULL,
         nota_administrativa = NULLIF(TRIM(?), ''),
         modificado_por_admin_id = ?`,
      [fecha, hora, nota, administradorId, nota, administradorId],
    );

    const [turnos] = await connection.execute(
      `SELECT id, fecha, hora_inicio, estado, nota_administrativa
       FROM turnos
       WHERE fecha = ? AND hora_inicio = ?
       LIMIT 1`,
      [fecha, hora],
    );

    await connection.commit();
    return turnos[0];
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function liberarTurno(fecha, hora) {
  const [resultSets] = await pool.query("CALL liberar_turno(?, ?)", [
    fecha,
    hora,
  ]);

  return obtenerPrimerResultado(resultSets)[0];
}

export async function bloquearFecha(fecha, motivo) {
  const [resultSets] = await pool.query("CALL bloquear_fecha(?, ?)", [
    fecha,
    motivo,
  ]);

  return obtenerPrimerResultado(resultSets)[0];
}

export async function desbloquearFecha(fecha) {
  const [resultSets] = await pool.query("CALL desbloquear_fecha(?)", [fecha]);

  return obtenerPrimerResultado(resultSets)[0];
}
