import "dotenv/config";
import mysql from "mysql2";

const ssl = process.env.DB_SSL_CA_BASE64
  ? {
      ca: Buffer.from(
        process.env.DB_SSL_CA_BASE64,
        "base64",
      ).toString("utf8"),
      rejectUnauthorized: true,
    }
  : undefined;

const nativePool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "agenda_estetica",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  dateStrings: true,
  timezone: "-03:00",
  ...(ssl ? { ssl } : {}),
});

nativePool.on("connection", (connection) => {
  connection.query("SET time_zone = '-03:00'", (error) => {
    if (error) {
      console.error(
        "No se pudo configurar la zona horaria de MySQL:",
        error.message,
      );
    }
  });
});

export const pool = nativePool.promise();

export async function comprobarConexion() {
  const [rows] = await pool.query(
    "SELECT DATABASE() AS base_de_datos, CURRENT_TIMESTAMP AS fecha_servidor",
  );

  return rows[0];
}

export async function cerrarConexion() {
  await pool.end();
}