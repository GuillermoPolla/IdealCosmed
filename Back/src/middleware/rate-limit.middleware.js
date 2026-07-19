import { rateLimit } from "express-rate-limit";

export const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Demasiados intentos de inicio de sesión. Intenta nuevamente más tarde",
    },
  },
});

export const limitarReservasTemporales = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: "Se realizaron demasiados intentos de reserva. Intenta nuevamente más tarde",
    },
  },
});
