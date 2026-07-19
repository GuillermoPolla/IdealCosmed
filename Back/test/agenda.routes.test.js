import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { app } from "../src/app.js";

test("GET /api/salud informa que la API está activa", async () => {
  const response = await request(app).get("/api/salud");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    estado: "activa",
  });
});

test("GET /api/agenda/horarios rechaza una fecha inexistente", async () => {
  const response = await request(app)
    .get("/api/agenda/horarios")
    .query({ fecha: "2026-02-30" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /api/agenda/reservas-temporales valida la hora", async () => {
  const response = await request(app)
    .post("/api/agenda/reservas-temporales")
    .send({ fecha: "2026-07-25", hora: "25:90" });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("una ruta inexistente devuelve 404", async () => {
  const response = await request(app).get("/api/no-existe");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
});

test("POST /api/admin/login exige usuario y contraseña", async () => {
  const response = await request(app).post("/api/admin/login").send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("las acciones administrativas exigen autenticación", async () => {
  const response = await request(app)
    .patch("/api/admin/turnos/ocupar")
    .send({ fecha: "2026-07-25", hora: "10:00" });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});
