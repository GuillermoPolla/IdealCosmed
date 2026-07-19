import jwt from "jsonwebtoken";
import { obtenerJwtSecret } from "../config/auth.js";
import { buscarAdministradorActivoPorId } from "../services/admin.service.js";
import { AppError } from "../utils/AppError.js";

export async function autenticarAdministrador(req, _res, next) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError("Debes iniciar sesión como administrador", 401));
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return next(new AppError("Debes iniciar sesión como administrador", 401));
  }

  try {
    const payload = jwt.verify(token, obtenerJwtSecret());
    const administrador = await buscarAdministradorActivoPorId(Number(payload.sub));

    if (!administrador) {
      return next(new AppError("La cuenta administradora no está activa", 401));
    }

    req.administrador = {
      id: administrador.id,
      nombreUsuario: administrador.nombre_usuario,
    };

    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    return next(new AppError("La sesión es inválida o venció", 401));
  }
}
