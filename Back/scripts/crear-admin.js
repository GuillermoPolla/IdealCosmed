import "dotenv/config";
import bcrypt from "bcryptjs";
import { cerrarConexion, pool } from "../src/config/database.js";

const nombreUsuario = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;

async function crearAdministrador() {
  try {
    if (!nombreUsuario || !/^[a-zA-Z0-9._-]{3,50}$/.test(nombreUsuario)) {
      throw new Error(
        "ADMIN_USERNAME debe tener entre 3 y 50 caracteres y no contener espacios",
      );
    }

    if (!password || password.length < 10) {
      throw new Error("ADMIN_PASSWORD debe contener al menos 10 caracteres");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO administradores (nombre_usuario, password_hash, activo)
       VALUES (?, ?, TRUE)
       ON DUPLICATE KEY UPDATE
         password_hash = VALUES(password_hash),
         activo = TRUE`,
      [nombreUsuario, passwordHash],
    );

    console.log(
      `Administrador '${nombreUsuario}' creado o actualizado correctamente`,
    );
  } catch (error) {
    console.error("No se pudo crear el administrador:", error.message);
    process.exitCode = 1;
  } finally {
    await cerrarConexion();
  }
}

crearAdministrador();
