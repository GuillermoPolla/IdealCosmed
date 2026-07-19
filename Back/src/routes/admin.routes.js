import { Router } from "express";
import {
  bloquear,
  desbloquear,
  iniciarSesion,
  liberar,
  marcarOcupado,
} from "../controllers/admin.controller.js";
import { autenticarAdministrador } from "../middleware/auth.middleware.js";
import { limitarLogin } from "../middleware/rate-limit.middleware.js";

export const adminRouter = Router();

adminRouter.post("/login", limitarLogin, iniciarSesion);

adminRouter.use(autenticarAdministrador);
adminRouter.patch("/turnos/ocupar", marcarOcupado);
adminRouter.post("/turnos/liberar", liberar);
adminRouter.post("/fechas/bloquear", bloquear);
adminRouter.post("/fechas/desbloquear", desbloquear);
