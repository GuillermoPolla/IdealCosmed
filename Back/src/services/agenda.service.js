import { pool } from "../config/database.js";

function obtenerPrimerResultado(resultSets) {
  if (!Array.isArray(resultSets) || !Array.isArray(resultSets[0])) {
    return [];
  }

  return resultSets[0];
}

export async function buscarHorariosPorFecha(fecha) {
  const [resultSets] = await pool.query(
    "CALL obtener_horarios_fecha(?)",
    [fecha],
  );

  return obtenerPrimerResultado(resultSets);
}

export async function crearReservaTemporal(fecha, hora) {
  const [resultSets] = await pool.query(
    "CALL reservar_turno_temporal(?, ?)",
    [fecha, hora],
  );

  return obtenerPrimerResultado(resultSets)[0];
}
