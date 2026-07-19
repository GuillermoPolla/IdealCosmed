import { Router } from "express";
import {
  obtenerHorarios,
  reservarTemporalmente,
} from "../controllers/agenda.controller.js";
import { limitarReservasTemporales } from "../middleware/rate-limit.middleware.js";

export const agendaRouter = Router();

agendaRouter.get("/horarios", obtenerHorarios);
agendaRouter.post(
  "/reservas-temporales",
  limitarReservasTemporales,
  reservarTemporalmente,
);
