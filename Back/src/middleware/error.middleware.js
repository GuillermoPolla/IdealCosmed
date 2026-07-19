import { AppError } from "../utils/AppError.js";

export function rutaNoEncontrada(req, _res, next) {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
}

export function manejarError(error, _req, res, _next) {
  const esErrorDeNegocioMySql =
    error.sqlState === "45000" || error.errno === 1644 || error.errno === 1062;

  const statusCode =
    error.statusCode ||
    error.status ||
    (esErrorDeNegocioMySql ? 409 : 500);

  const message =
    statusCode >= 500
      ? "Ocurrió un error interno en el servidor"
      : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    error: { message },
  });
}
