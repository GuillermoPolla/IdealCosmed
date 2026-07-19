import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  obtenerJwtSecret,
  obtenerVencimientoJwt,
} from "../config/auth.js";
import {
  bloquearFecha,
  buscarAdministradorPorUsuario,
  desbloquearFecha,
  liberarTurno,
  ocuparTurno,
  registrarUltimoAcceso,
} from "../services/admin.service.js";
import { AppError } from "../utils/AppError.js";
import { esFechaValida, normalizarHora } from "../utils/validators.js";

function validarFechaYHora(fecha, receivedTime) {
  if (!esFechaValida(fecha)) {
    throw new AppError("La fecha debe tener el formato válido AAAA-MM-DD", 400);
  }

  const hora = normalizarHora(receivedTime);

  if (!hora) {
    throw new AppError("La hora debe tener el formato válido HH:MM", 400);
  }

  return hora;
}

export async function iniciarSesion(req, res, next) {
  const nombreUsuario = req.body?.nombreUsuario?.trim();
  const password = req.body?.password;

  if (!nombreUsuario || typeof password !== "string" || !password) {
    return next(new AppError("El usuario y la contraseña son obligatorios", 400));
  }

  try {
    const administrador = await buscarAdministradorPorUsuario(nombreUsuario);
    const credencialesValidas =
      administrador?.activo &&
      (await bcrypt.compare(password, administrador.password_hash));

    if (!credencialesValidas) {
      return next(new AppError("Usuario o contraseña incorrectos", 401));
    }

    await registrarUltimoAcceso(administrador.id);

    const token = jwt.sign(
      {
        sub: String(administrador.id),
        usuario: administrador.nombre_usuario,
      },
      obtenerJwtSecret(),
      { expiresIn: obtenerVencimientoJwt() },
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        administrador: {
          id: administrador.id,
          nombreUsuario: administrador.nombre_usuario,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function marcarOcupado(req, res, next) {
  const { fecha, hora: receivedTime, nota = "" } = req.body ?? {};

  try {
    const hora = validarFechaYHora(fecha, receivedTime);

    if (typeof nota !== "string" || nota.length > 255) {
      throw new AppError("La nota no puede superar los 255 caracteres", 400);
    }

    const turno = await ocuparTurno(fecha, hora, nota);

    return res.status(200).json({
      success: true,
      message: "El turno quedó confirmado como ocupado",
      data: {
        id: turno.id,
        fecha: turno.fecha,
        horaInicio: turno.hora_inicio,
        estado: turno.estado,
        notaAdministrativa: turno.nota_administrativa,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function liberar(req, res, next) {
  const { fecha, hora: receivedTime } = req.body ?? {};

  try {
    const hora = validarFechaYHora(fecha, receivedTime);
    const turno = await liberarTurno(fecha, hora);

    return res.status(200).json({
      success: true,
      message: "El horario volvió a estar disponible",
      data: {
        fecha: turno.fecha,
        horaInicio: turno.hora_inicio,
        estado: turno.estado,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function bloquear(req, res, next) {
  const { fecha, motivo = "" } = req.body ?? {};

  if (!esFechaValida(fecha)) {
    return next(
      new AppError("La fecha debe tener el formato válido AAAA-MM-DD", 400),
    );
  }

  if (typeof motivo !== "string" || motivo.length > 255) {
    return next(new AppError("El motivo no puede superar los 255 caracteres", 400));
  }

  try {
    const bloqueo = await bloquearFecha(fecha, motivo);

    return res.status(201).json({
      success: true,
      message: "La fecha quedó bloqueada",
      data: {
        fecha: bloqueo.fecha,
        motivo: bloqueo.motivo,
        creadoEn: bloqueo.creado_en,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function desbloquear(req, res, next) {
  const { fecha } = req.body ?? {};

  if (!esFechaValida(fecha)) {
    return next(
      new AppError("La fecha debe tener el formato válido AAAA-MM-DD", 400),
    );
  }

  try {
    const desbloqueo = await desbloquearFecha(fecha);

    return res.status(200).json({
      success: true,
      message: "La fecha volvió a estar habilitada",
      data: {
        fecha: desbloqueo.fecha,
        estado: desbloqueo.estado,
      },
    });
  } catch (error) {
    return next(error);
  }
}
