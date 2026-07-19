import { pool } from "../config/database.js";

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

export async function ocuparTurno(fecha, hora, nota) {
  const [resultSets] = await pool.query(
    "CALL marcar_turno_ocupado(?, ?, ?)",
    [fecha, hora, nota],
  );

  return obtenerPrimerResultado(resultSets)[0];
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
