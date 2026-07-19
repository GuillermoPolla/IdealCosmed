import "dotenv/config";
import { app } from "./app.js";
import { validarConfiguracionAutenticacion } from "./config/auth.js";
import {
  cerrarConexion,
  comprobarConexion,
} from "./config/database.js";

const port = Number(process.env.PORT) || 3000;
let server;

async function iniciarServidor() {
  try {
    validarConfiguracionAutenticacion();
    const databaseStatus = await comprobarConexion();

    console.log(
      `MySQL conectado a la base ${databaseStatus.base_de_datos} ` +
        `(hora del servidor: ${databaseStatus.fecha_servidor})`,
    );

    server = app.listen(port, () => {
      console.log(`Backend disponible en http://localhost:${port}`);
    });
  } catch (error) {
    console.error("No se pudo conectar con MySQL:", error.message);
    await cerrarConexion();
    process.exitCode = 1;
  }
}

async function apagarServidor(signal) {
  console.log(`\nSe recibió ${signal}. Cerrando el servidor...`);

  if (!server) {
    await cerrarConexion();
    return;
  }

  server.close(async () => {
    await cerrarConexion();
    console.log("Servidor cerrado correctamente");
  });
}

process.once("SIGINT", () => apagarServidor("SIGINT"));
process.once("SIGTERM", () => apagarServidor("SIGTERM"));

iniciarServidor();
