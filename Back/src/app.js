import "dotenv/config";
import cors from "cors";
import express from "express";
import { manejarError, rutaNoEncontrada } from "./middleware/error.middleware.js";
import { adminRouter } from "./routes/admin.routes.js";
import { agendaRouter } from "./routes/agenda.routes.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "20kb" }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "API de la agenda del centro estético",
  });
});

app.get("/api/salud", (_req, res) => {
  res.json({
    success: true,
    estado: "activa",
  });
});

app.use("/api/agenda", agendaRouter);
app.use("/api/admin", adminRouter);

app.use(rutaNoEncontrada);
app.use(manejarError);
