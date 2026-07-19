import {
  buscarHorariosPorFecha,
  crearReservaTemporal,
} from "../services/agenda.service.js";
import { AppError } from "../utils/AppError.js";
import { esFechaValida, normalizarHora } from "../utils/validators.js";

function presentarHorario(row) {
  return {
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    estado: row.estado,
  };
}

function presentarReserva(row) {
  return {
    id: row.id,
    fecha: row.fecha,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    estado: row.estado,
    pendienteHasta: row.pendiente_hasta,
  };
}

export async function obtenerHorarios(req, res, next) {
  const { fecha } = req.query;

  if (!esFechaValida(fecha)) {
    return next(
      new AppError("La fecha debe tener el formato válido AAAA-MM-DD", 400),
    );
  }

  try {
    const horarios = await buscarHorariosPorFecha(fecha);

    return res.status(200).json({
      success: true,
      data: {
        fecha,
        horarios: horarios.map(presentarHorario),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function reservarTemporalmente(req, res, next) {
  const { fecha, hora: receivedTime } = req.body ?? {};
  const hora = normalizarHora(receivedTime);

  if (!esFechaValida(fecha)) {
    return next(
      new AppError("La fecha debe tener el formato válido AAAA-MM-DD", 400),
    );
  }

  if (!hora) {
    return next(
      new AppError("La hora debe tener el formato válido HH:MM", 400),
    );
  }

  try {
    const reserva = await crearReservaTemporal(fecha, hora);

    return res.status(201).json({
      success: true,
      message: "El horario quedó pendiente durante 30 minutos",
      data: presentarReserva(reserva),
    });
  } catch (error) {
    return next(error);
  }
}
