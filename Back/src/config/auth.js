import "dotenv/config";

export function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET debe existir en .env y contener al menos 32 caracteres",
    );
  }

  return secret;
}

export function obtenerVencimientoJwt() {
  return process.env.JWT_EXPIRES_IN || "8h";
}

export function validarConfiguracionAutenticacion() {
  obtenerJwtSecret();
}
